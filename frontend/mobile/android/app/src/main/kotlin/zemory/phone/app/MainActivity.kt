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
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
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
 * Zemory on the phone (plan/41 §6): the phone is a third machine of the user's network. The whole screen is the selected
 * machine's OWN interface, loaded through the link - no bar of its own: switching machines, scanning a pairing QR and
 * pasting a code live in the interface (Sync › Machine-to-machine), which reaches the app through `window.ZB`. Native
 * here only: the device lock, the QR scanner, and the settings kept on the machines.
 */
class MainActivity : Activity() {
    private val prefs by lazy { getSharedPreferences("zemory", Context.MODE_PRIVATE) }
    private val identity by lazy { Identity.loadOrCreate(filesDir, "phone") }
    private val io = Executors.newCachedThreadPool()
    private val links = ConcurrentHashMap<String, Link>()
    private lateinit var body: FrameLayout

    // app lock (plan/41 §6a): the device lock guards the app; more than 5 minutes in the background locks it again
    private var unlockedAt = 0L
    private var pausedAt = 0L
    private val lockRequest = 7

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    // ── settings: kept here AND on every machine (plan/41 §6c) ──
    private fun codes(): MutableList<String> = JSONArray(prefs.getString("pairings", "[]")).let { a -> (0 until a.length()).map { a.getString(it) }.toMutableList() }
    private fun pairings(): List<Pairing> = codes().mapNotNull { Pairing.parse(it) }

    /** A paired machine, or another machine of a paired one's cluster reached through it (plan/41 §6f). */
    data class Target(val host: String, val via: Pairing) {
        val direct: Boolean get() = host.equals(via.host, ignoreCase = true)
        fun label(): String = if (direct) host else "$host (qua ${via.host})"
    }

    private fun clusterOf(p: Pairing): List<String> = JSONArray(prefs.getString("cluster:${p.host}", "[]")).let { a -> (0 until a.length()).map { a.getString(it) } }

    private fun targets(): List<Target> {
        val ps = pairings()
        val out = ps.map { Target(it.host, it) }.toMutableList()
        for (p in ps) for (h in clusterOf(p)) if (out.none { it.host.equals(h, ignoreCase = true) }) out.add(Target(h, p))
        return out
    }

    /** The machine on screen (kept across launches). */
    private fun current(): Target? {
        val all = targets()
        val want = prefs.getString("current", null)
        return all.firstOrNull { it.host.equals(want, ignoreCase = true) } ?: all.firstOrNull()
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
        if (added) prefs.edit().putString("pairings", JSONArray(mine).toString()).apply()
    }

    private fun shareSettings() {
        val blob = settingsBlob()
        for (l in links.values) io.execute { if (l.alive) l.prefs(blob) }
    }

    private fun refreshCluster(p: Pairing, l: Link) {
        val r = l.request("GET", "/cluster")
        if (r.status != 200) return
        val a = JSONObject(r.text).optJSONArray("machines") ?: return
        val hosts = JSONArray()
        for (i in 0 until a.length()) {
            val m = a.getJSONObject(i)
            if (!m.optBoolean("self")) hosts.put(m.getString("host"))
        }
        prefs.edit().putString("cluster:${p.host}", hosts.toString()).apply()
    }

    private fun link(p: Pairing): Link {
        links[p.host]?.let { if (it.alive) return it }
        val l = Link.open(p, identity)
        links[p.host] = l
        mergeSettings(l.prefs(settingsBlob()))
        io.execute { runCatching { refreshCluster(p, l) } }
        return l
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        body = FrameLayout(this).apply { setBackgroundColor(Color.parseColor("#111418")) }
        setContentView(body)
        takeLink(intent)
    }

    override fun onResume() {
        super.onResume()
        val km = getSystemService(KEYGUARD_SERVICE) as KeyguardManager
        if (!km.isDeviceSecure) return showNote("Đặt khoá màn hình (PIN / vân tay) cho điện thoại để mở Zemory.")
        val away = pausedAt > 0 && SystemClock.elapsedRealtime() - pausedAt > 5 * 60_000
        if (unlockedAt == 0L || away) {
            unlockedAt = 0L
            @Suppress("DEPRECATION")
            val i: Intent? = km.createConfirmDeviceCredentialIntent("Zemory", "Mở khoá để xem các máy của bạn")
            if (i != null) startActivityForResult(i, lockRequest) else { unlockedAt = SystemClock.elapsedRealtime(); show() }
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
        if (resultCode != RESULT_OK) return finish()
        unlockedAt = SystemClock.elapsedRealtime()
        pausedAt = 0
        val c = pendingCode
        pendingCode = null
        if (c != null) addCode(c) else show()
    }

    private fun locked() = unlockedAt == 0L

    /** The machine's interface, or - with no machine yet - the two ways to add one. */
    private fun show() {
        if (locked()) return
        if (targets().isEmpty()) showFirstRun() else showZemory()
    }

    private fun showNote(text: String) {
        body.removeAllViews()
        body.addView(TextView(this).apply { this.text = text; setTextColor(Color.parseColor("#9AA4B2")); setPadding(dp(24), dp(48), dp(24), dp(24)) })
    }

    private fun showFirstRun() {
        body.removeAllViews()
        val col = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(dp(24), dp(24), dp(24), dp(24)) }
        col.addView(TextView(this).apply {
            text = "Zemory\n\nTrên PC hoặc laptop: Sync › Máy-tới-máy › Ghép điện thoại.\nRồi quét mã QR, hoặc dán mã chữ."
            setTextColor(Color.parseColor("#E5E7EB")); gravity = Gravity.CENTER; textSize = 15f
        })
        col.addView(Button(this).apply { text = "📷 Quét QR"; setOnClickListener { scan() } }, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = dp(24) })
        col.addView(Button(this).apply { text = "⌨ Dán mã"; setOnClickListener { paste() } }, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        body.addView(col, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
    }

    // ── adding a machine: scan the QR a machine shows, or paste its text code ──
    private fun scan() {
        GmsBarcodeScanning.getClient(this).startScan()
            .addOnSuccessListener { b -> (b.rawValue ?: "").let { v -> addCode(Regex("c=([A-Za-z0-9._-]+)").find(v)?.groupValues?.get(1) ?: v) } }
            .addOnFailureListener { e -> AlertDialog.Builder(this).setMessage("Không quét được: ${e.message}\nDùng Dán mã thay.").setPositiveButton("OK", null).show() }
    }

    private fun paste() {
        val field = EditText(this).apply { hint = "zph1.…" }
        AlertDialog.Builder(this).setTitle("Dán mã").setMessage("Trên PC hoặc laptop: Sync › Máy-tới-máy › Ghép điện thoại › Mã chữ › Chép.").setView(field)
            .setPositiveButton("Thêm") { _, _ -> addCode(field.text.toString()) }
            .setNegativeButton("Huỷ", null).show()
    }

    private fun addCode(raw: String) {
        val code = raw.trim()
        val p = Pairing.parse(code) ?: run {
            AlertDialog.Builder(this).setMessage("Mã ghép đôi không đọc được.").setPositiveButton("OK", null).show()
            return
        }
        val kept = codes().filter { Pairing.parse(it)?.host != p.host }.toMutableList()
        kept.add(code)
        prefs.edit().putString("pairings", JSONArray(kept).toString()).putString("current", p.host).apply()
        links.remove(p.host)?.close()
        io.execute {
            runCatching { link(p) }
            shareSettings()
        }
        showZemory()
    }

    /** A pairing code that came by the QR link (the system camera), kept until the app is unlocked. */
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

    // ── the machine's own interface, full screen ────────────────────────────────────────────────────────
    @SuppressLint("SetJavaScriptEnabled")
    private fun showZemory() {
        if (locked()) return
        val tg = current() ?: return showFirstRun()
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
                    return page("Không nối được ${tg.label()}.<br>${e.message}")
                }
                if (r.status == 503 && on != null) return page("${tg.host} chưa nối với ${p.host} lúc này. Thử lại sau, hoặc mở ${p.host}.")
                val type = r.type.substringBefore(";").trim().ifBlank { "application/octet-stream" }
                // the bridge must run before the interface's own scripts
                val bytes = if (type == "text/html") r.text.replaceFirst("<head>", "<head><script src=\"/__bridge.js\"></script>").toByteArray() else r.body
                return WebResourceResponse(type, "utf-8", r.status, if (r.status in 200..299) "OK" else "Error", mapOf("Cache-Control" to "no-store"), ByteArrayInputStream(bytes))
            }
        }
        body.addView(w, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        w.loadUrl("https://zemory.app/")
    }

    /** A page the app draws itself when the machine cannot answer - with the ways out (other machine · add one). */
    private fun page(msg: String): WebResourceResponse {
        val others = targets().joinToString("") { "<button onclick=\"ZB.open('${it.host}')\">${it.label()}</button>" }
        val html = "<!doctype html><meta name=viewport content='width=device-width'><body style='background:#111418;color:#ccc;font:14px sans-serif;padding:24px'>" +
            "<p>$msg</p><div style='display:flex;flex-direction:column;gap:8px'>$others<button onclick='ZB.scan()'>📷 Quét QR</button><button onclick='ZB.paste()'>⌨ Dán mã</button></div></body>"
        return WebResourceResponse("text/html", "utf-8", ByteArrayInputStream(html.toByteArray()))
    }

    /** The interface's side of the app: its fetch calls (bridge.js), and the machine switch / pairing it shows on a phone. */
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

        /** The machines this phone holds: `{current, list:[{host, label, direct}]}`. */
        @JavascriptInterface
        fun machines(): String {
            val a = JSONArray()
            for (t in targets()) a.put(JSONObject().put("host", t.host).put("label", t.label()).put("direct", t.direct))
            return JSONObject().put("current", current()?.host ?: "").put("list", a).toString()
        }

        @JavascriptInterface
        fun open(host: String) {
            prefs.edit().putString("current", host).apply()
            runOnUiThread { showZemory() }
        }

        @JavascriptInterface
        fun scan() = runOnUiThread { this@MainActivity.scan() }

        @JavascriptInterface
        fun paste() = runOnUiThread { this@MainActivity.paste() }
    }

    override fun onDestroy() {
        super.onDestroy()
        links.values.forEach { it.close() }
        io.shutdown()
    }
}
