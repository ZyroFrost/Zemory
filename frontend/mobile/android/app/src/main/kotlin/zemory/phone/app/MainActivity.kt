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

    /**
     * One machine on the picker: a paired one (`host == via.host`), or another machine of a paired one's cluster, reached
     * through `via` (plan/41 §6f) - joining the cluster once shows every machine in it.
     */
    data class Target(val host: String, val via: Pairing) {
        val direct: Boolean get() = host.equals(via.host, ignoreCase = true)
        fun label(): String = if (direct) host else "$host (qua ${via.host})"
    }

    /** The cluster each paired machine last reported (`GET /cluster`), kept so the picker fills before any link opens. */
    private fun clusterOf(p: Pairing): List<String> = JSONArray(prefs.getString("cluster:${p.host}", "[]")).let { a -> (0 until a.length()).map { a.getString(it) } }

    private fun targets(): List<Target> {
        val ps = pairings()
        val out = ps.map { Target(it.host, it) }.toMutableList()
        for (p in ps) for (h in clusterOf(p)) if (out.none { it.host.equals(h, ignoreCase = true) }) out.add(Target(h, p))
        return out
    }

    private fun current(): Target? = targets().getOrNull(machine.selectedItemPosition)

    /** Ask a paired machine who is in its cluster; refresh the picker when that changed. */
    private fun refreshCluster(p: Pairing, l: Link) {
        val r = l.request("GET", "/cluster")
        if (r.status != 200) return
        val a = JSONObject(r.text).optJSONArray("machines") ?: return
        val hosts = JSONArray()
        for (i in 0 until a.length()) {
            val m = a.getJSONObject(i)
            if (!m.optBoolean("self")) hosts.put(m.getString("host"))
        }
        if (hosts.toString() == JSONArray(clusterOf(p)).toString()) return
        prefs.edit().putString("cluster:${p.host}", hosts.toString()).apply()
        runOnUiThread { loadMachines() }
    }

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
        // and the cluster behind it: every machine it is paired with shows on the picker
        io.execute { runCatching { refreshCluster(p, l) } }
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
        takeLink(intent)
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
            val c = pendingCode
            pendingCode = null
            if (c != null) addCode(c) else showZemory()
        } else finish()
    }

    private fun locked() = unlockedAt == 0L

    private fun loadMachines() {
        val list = targets()
        val sel = machine.selectedItemPosition
        machine.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, list.map { it.label() }.ifEmpty { listOf("Chưa có máy") })
        if (sel in list.indices) machine.setSelection(sel)
        if (list.isEmpty()) status.text = "Trên máy tính chạy: zemory phone pair <tên-điện-thoại>, rồi dán mã vào + Máy."
        // machines arrived (pairing, or settings merged from a machine) while nothing is shown: show the selected one
        else if (body.childCount == 0 && !locked()) showZemory()
    }

    private fun addMachine() {
        val field = EditText(this).apply { hint = "zph1.…" }
        AlertDialog.Builder(this).setTitle("Thêm máy")
            .setMessage("Trên máy tính: Sync › Máy-tới-máy › Ghép điện thoại, rồi quét mã QR bằng camera. Hoặc dán mã zph1.… vào đây.")
            .setView(field)
            .setPositiveButton("Thêm") { _, _ -> addCode(field.text.toString()) }
            .setNegativeButton("Huỷ", null).show()
    }

    /** Keep one machine's pairing code (from the QR link or pasted) and open its interface. */
    private fun addCode(raw: String) {
        val code = raw.trim()
        val p = Pairing.parse(code) ?: run { status.text = "Mã ghép đôi không đọc được"; return }
        val kept = codes().filter { Pairing.parse(it)?.host != p.host }.toMutableList()
        kept.add(code)
        prefs.edit().putString("pairings", JSONArray(kept).toString()).apply()
        links.remove(p.host)?.close()
        loadMachines()
        machine.setSelection(targets().indexOfFirst { it.direct && it.host == p.host })
        status.text = "Đã thêm ${p.host}"
        io.execute {
            runCatching { link(p) }
            shareSettings()
        }
        // the first machine replaces the "no machine" item at the SAME position, so the spinner fires no selection
        // event - open the interface here, or the screen stays empty after pairing
        showZemory()
    }

    /** A pairing code that came by the QR link, kept until the app is unlocked. */
    private var pendingCode: String? = null

    private fun takeLink(i: Intent?) {
        val d = i?.data ?: return
        if (d.scheme == "zemory" && d.host == "pair") d.getQueryParameter("c")?.let { pendingCode = it }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        takeLink(intent)
        if (!locked()) pendingCode?.let { pendingCode = null; addCode(it) }
    }

    // ── the machine's own interface ─────────────────────────────────────────────────────────────────────
    @SuppressLint("SetJavaScriptEnabled")
    private fun showZemory() {
        if (locked()) return
        val tg = current() ?: return
        val p = tg.via
        // a machine reached through another one: every call names it, the paired machine forwards it (plan/41 §6f)
        val on = if (tg.direct) null else tg.host
        body.removeAllViews()
        val w = WebView(this)
        w.settings.javaScriptEnabled = true
        w.settings.domStorageEnabled = true
        w.addJavascriptInterface(Bridge(w, p, on), "ZB")
        w.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                val u = request.url
                if (u.host != "zemory.app") return null
                if (u.path == "/__bridge.js") return WebResourceResponse("text/javascript", "utf-8", assets.open("bridge.js"))
                val path = (u.encodedPath ?: "/") + (u.encodedQuery?.let { "?$it" } ?: "")
                val r = try {
                    link(p).request("GET", path, host = on)
                } catch (e: Exception) {
                    runOnUiThread { status.text = "Không nối được ${p.host}: ${e.message}" }
                    val page = "<body style='background:#111;color:#ccc;font:14px sans-serif;padding:24px'>Không nối được ${p.host}.<br>${e.message}</body>"
                    return WebResourceResponse("text/html", "utf-8", ByteArrayInputStream(page.toByteArray()))
                }
                if (r.status == 503 && on != null) {
                    // the paired machine has no live link to that one right now: say it, do not show a broken page
                    val page = "<body style='background:#111;color:#ccc;font:14px sans-serif;padding:24px'>${tg.host} chưa nối với ${p.host} lúc này.<br>Thử lại sau, hoặc chọn ${p.host}.</body>"
                    return WebResourceResponse("text/html", "utf-8", ByteArrayInputStream(page.toByteArray()))
                }
                runOnUiThread { status.text = if (on == null) "${p.host} · ${links[p.host]?.via ?: ""}" else "${tg.host} · qua ${p.host}" }
                val type = r.type.substringBefore(";").trim().ifBlank { "application/octet-stream" }
                // the bridge must run before the interface's own scripts
                val bytes = if (type == "text/html") r.text.replaceFirst("<head>", "<head><script src=\"/__bridge.js\"></script>").toByteArray() else r.body
                return WebResourceResponse(type, "utf-8", r.status, if (r.status in 200..299) "OK" else "Error", mapOf("Cache-Control" to "no-store"), ByteArrayInputStream(bytes))
            }
        }
        body.addView(w, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        status.text = "Đang nối tới ${tg.label()}…"
        w.loadUrl("https://zemory.app/")
    }

    /** The interface's fetch calls, handed over by bridge.js. */
    inner class Bridge(private val w: WebView, private val p: Pairing, private val on: String?) {
        @JavascriptInterface
        fun req(id: String, method: String, path: String, b64: String, type: String) {
            io.execute {
                val body = if (b64.isEmpty()) null else Base64.decode(b64, Base64.DEFAULT)
                val r = try { link(p).request(method, path, body, type, host = on) } catch (e: Exception) { Reply(502, "text/plain", (e.message ?: "").toByteArray()) }
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
