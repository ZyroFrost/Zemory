package zemory.phone.app

import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.os.SystemClock
import android.util.Base64
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject
import zemory.phone.Identity
import zemory.phone.Link
import zemory.phone.Pairing
import zemory.phone.Reply
import java.io.ByteArrayInputStream
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

/**
 * Zemory on the phone (plan/41 §6): the phone is a third machine of the user's network. The screen is the selected
 * machine's OWN interface, loaded through the link - the project chat (plan/41 §6b) and the permission prompts (§6e)
 * live in it, one interface for desktop and phone. Native here: the device lock, the machine picker, pairing, and the
 * settings that live on the machines (a new phone paired with any machine gets them back).
 */
class MainActivity : Activity() {
    private val prefs by lazy { getSharedPreferences("zemory", Context.MODE_PRIVATE) }
    private val identity by lazy { Identity.loadOrCreate(filesDir, "phone") }
    private val io = Executors.newCachedThreadPool()
    private val links = ConcurrentHashMap<String, Link>()

    private lateinit var machine: Spinner
    private lateinit var status: TextView
    private lateinit var body: FrameLayout

    // app lock (plan/41 §6a): the device lock guards the app; more than 5 minutes in the background locks it again
    private var unlockedAt = 0L
    private var pausedAt = 0L
    private val lockRequest = 7

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    // ── settings: kept here AND on every machine (plan/41 §6c) ──
    private fun codes(): MutableList<String> = JSONArray(prefs.getString("pairings", "[]")).let { a -> (0 until a.length()).map { a.getString(it) }.toMutableList() }
    private fun pairings(): List<Pairing> = codes().mapNotNull { Pairing.parse(it) }
    private fun current(): Pairing? = pairings().getOrNull(machine.selectedItemPosition)

    private fun settingsBlob(): String = JSONObject().put("v", 1).put("machines", JSONArray(codes())).toString()

    /** Take machines the phone does not know yet from a machine's copy of the settings (a new phone gets them back). */
    private fun mergeSettings(blob: String?) {
        if (blob.isNullOrBlank()) return
        val j = runCatching { JSONObject(blob) }.getOrNull() ?: return
        val mine = codes()
        val hosts = pairings().map { it.host }.toMutableSet()
        val a = j.optJSONArray("machines") ?: JSONArray()
        var added = false
        for (i in 0 until a.length()) {
            val p = Pairing.parse(a.getString(i)) ?: continue
            if (hosts.add(p.host)) {
                mine.add(a.getString(i))
                added = true
            }
        }
        if (added) {
            prefs.edit().putString("pairings", JSONArray(mine).toString()).apply()
            runOnUiThread { loadMachines() }
        }
    }

    /** Push the settings to every machine a link is open to. */
    private fun shareSettings() {
        val blob = settingsBlob()
        for (l in links.values) io.execute { if (l.alive) l.prefs(blob) }
    }

    private fun link(p: Pairing): Link {
        links[p.host]?.let { if (it.alive) return it }
        val l = Link.open(p, identity)
        links[p.host] = l
        // settings travel with the link: give ours, take what the machine kept
        mergeSettings(l.prefs(settingsBlob()))
        return l
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#111418"))
            setPadding(dp(8), dp(20), dp(8), dp(4))
        }
        val top = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        machine = Spinner(this)
        top.addView(machine, LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f))
        top.addView(Button(this).apply { text = "+ Máy"; setOnClickListener { addMachine() } })
        root.addView(top)
        status = TextView(this).apply { setTextColor(Color.parseColor("#9AA4B2")); textSize = 12f }
        root.addView(status)
        body = FrameLayout(this)
        root.addView(body, LinearLayout.LayoutParams(MATCH_PARENT, 0, 1f))
        setContentView(root)
        loadMachines()
        machine.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) = showZemory()
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
    }

    override fun onResume() {
        super.onResume()
        val km = getSystemService(KEYGUARD_SERVICE) as KeyguardManager
        if (!km.isDeviceSecure) {
            body.removeAllViews()
            status.text = "Đặt khoá màn hình (PIN / vân tay) cho điện thoại để mở Zemory."
            return
        }
        val away = pausedAt > 0 && SystemClock.elapsedRealtime() - pausedAt > 5 * 60_000
        if (unlockedAt == 0L || away) {
            unlockedAt = 0L
            @Suppress("DEPRECATION")
            val i: Intent? = km.createConfirmDeviceCredentialIntent("Zemory", "Mở khoá để xem các máy của bạn")
            if (i != null) startActivityForResult(i, lockRequest) else unlockedAt = SystemClock.elapsedRealtime()
        }
    }

    override fun onPause() {
        super.onPause()
        pausedAt = SystemClock.elapsedRealtime()
    }

    @Deprecated("Activity result API kept on purpose: no AndroidX in this app")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != lockRequest) return
        if (resultCode == RESULT_OK) {
            unlockedAt = SystemClock.elapsedRealtime()
            pausedAt = 0
            showZemory()
        } else finish()
    }

    private fun locked() = unlockedAt == 0L

    private fun loadMachines() {
        val list = pairings()
        val sel = machine.selectedItemPosition
        machine.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, list.map { it.host }.ifEmpty { listOf("Chưa có máy") })
        if (sel in list.indices) machine.setSelection(sel)
        if (list.isEmpty()) status.text = "Trên máy tính chạy: zemory phone pair <tên-điện-thoại>, rồi dán mã vào + Máy."
    }

    private fun addMachine() {
        val field = EditText(this).apply { hint = "zph1.…" }
        AlertDialog.Builder(this).setTitle("Thêm máy").setMessage("Trên máy tính: zemory phone pair <tên-điện-thoại>").setView(field)
            .setPositiveButton("Thêm") { _, _ ->
                val code = field.text.toString().trim()
                val p = Pairing.parse(code) ?: run { status.text = "Mã ghép đôi không đọc được"; return@setPositiveButton }
                val kept = codes().filter { Pairing.parse(it)?.host != p.host }.toMutableList()
                kept.add(code)
                prefs.edit().putString("pairings", JSONArray(kept).toString()).apply()
                links.remove(p.host)?.close()
                loadMachines()
                machine.setSelection(pairings().indexOfFirst { it.host == p.host })
                io.execute {
                    runCatching { link(p) }
                    shareSettings()
                }
            }
            .setNegativeButton("Huỷ", null).show()
    }

    // ── the machine's own interface ─────────────────────────────────────────────────────────────────────
    @SuppressLint("SetJavaScriptEnabled")
    private fun showZemory() {
        if (locked()) return
        val p = current() ?: return
        body.removeAllViews()
        val w = WebView(this)
        w.settings.javaScriptEnabled = true
        w.settings.domStorageEnabled = true
        w.addJavascriptInterface(Bridge(w, p), "ZB")
        w.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                val u = request.url
                if (u.host != "zemory.app") return null
                if (u.path == "/__bridge.js") return WebResourceResponse("text/javascript", "utf-8", assets.open("bridge.js"))
                val path = (u.encodedPath ?: "/") + (u.encodedQuery?.let { "?$it" } ?: "")
                val r = try {
                    link(p).request("GET", path)
                } catch (e: Exception) {
                    runOnUiThread { status.text = "Không nối được ${p.host}: ${e.message}" }
                    val page = "<body style='background:#111;color:#ccc;font:14px sans-serif;padding:24px'>Không nối được ${p.host}.<br>${e.message}</body>"
                    return WebResourceResponse("text/html", "utf-8", ByteArrayInputStream(page.toByteArray()))
                }
                runOnUiThread { status.text = "${p.host} · ${links[p.host]?.via ?: ""}" }
                val type = r.type.substringBefore(";").trim().ifBlank { "application/octet-stream" }
                // the bridge must run before the interface's own scripts
                val bytes = if (type == "text/html") r.text.replaceFirst("<head>", "<head><script src=\"/__bridge.js\"></script>").toByteArray() else r.body
                return WebResourceResponse(type, "utf-8", r.status, if (r.status in 200..299) "OK" else "Error", mapOf("Cache-Control" to "no-store"), ByteArrayInputStream(bytes))
            }
        }
        body.addView(w, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        status.text = "Đang nối tới ${p.host}…"
        w.loadUrl("https://zemory.app/")
    }

    /** The interface's fetch calls, handed over by bridge.js. */
    inner class Bridge(private val w: WebView, private val p: Pairing) {
        @JavascriptInterface
        fun req(id: String, method: String, path: String, b64: String, type: String) {
            io.execute {
                val body = if (b64.isEmpty()) null else Base64.decode(b64, Base64.DEFAULT)
                val r = try { link(p).request(method, path, body, type) } catch (e: Exception) { Reply(502, "text/plain", (e.message ?: "").toByteArray()) }
                val enc = Base64.encodeToString(r.body, Base64.NO_WRAP)
                runOnUiThread { w.evaluateJavascript("window.__zres(${JSONObject.quote(id)},${r.status},${JSONObject.quote(r.type)},${JSONObject.quote(enc)})", null) }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        links.values.forEach { it.close() }
        io.shutdown()
    }
}
