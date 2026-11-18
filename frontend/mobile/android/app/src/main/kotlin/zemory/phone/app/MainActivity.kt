package zemory.phone.app

import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
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
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject
import zemory.phone.Identity
import zemory.phone.Letter
import zemory.phone.Link
import zemory.phone.Pairing
import zemory.phone.Reply
import java.io.ByteArrayInputStream
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

/**
 * Zemory on the phone (plan/41 §6): the phone is a third machine of the user's network. Tab "Zemory" is the selected
 * machine's own interface, loaded through the link; tab "Chat" is one room per repo, merging every machine's letters.
 * The app opens only behind the device lock; settings live on the machines, so a new phone paired with any machine gets
 * them back.
 */
class MainActivity : Activity() {
    private val prefs by lazy { getSharedPreferences("zemory", Context.MODE_PRIVATE) }
    private val identity by lazy { Identity.loadOrCreate(filesDir, "phone") }
    private val io = Executors.newCachedThreadPool()
    private val links = ConcurrentHashMap<String, Link>()
    private val clock = DateTimeFormatter.ofPattern("dd/MM HH:mm").withZone(ZoneId.systemDefault())

    private lateinit var machine: Spinner
    private lateinit var status: TextView
    private lateinit var body: FrameLayout
    private var chat: LinearLayout? = null
    private var room: String? = null
    private var onChat = false

    // permission prompts of the machines' agents, answered from here (plan/41 §6e)
    private val ui = android.os.Handler(android.os.Looper.getMainLooper())
    private var approvalsBox: LinearLayout? = null
    private val shownApprovals = HashSet<String>()
    private val pollApprovals = object : Runnable {
        override fun run() {
            if (!onChat || locked()) return
            refreshApprovals()
            ui.postDelayed(this, 4_000)
        }
    }

    // app lock (plan/41 §6a): the device lock guards the app; more than 5 minutes in the background locks it again
    private var unlockedAt = 0L
    private var pausedAt = 0L
    private val lockRequest = 7

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    // ── settings: kept here AND on every machine (plan/41 §6c) ──
    private fun codes(): MutableList<String> = JSONArray(prefs.getString("pairings", "[]")).let { a -> (0 until a.length()).map { a.getString(it) }.toMutableList() }
    private fun pairings(): List<Pairing> = codes().mapNotNull { Pairing.parse(it) }
    private fun current(): Pairing? = pairings().getOrNull(machine.selectedItemPosition)

    private fun settingsBlob(): String = JSONObject().put("v", 1).put("machines", JSONArray(codes())).put("room", room ?: "").toString()

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
        val l = Link.open(p, identity, onMail = { letter -> runOnUiThread { if (onChat && room != null && roomOf(letter) == room) showRoom(room!!) } })
        links[p.host] = l
        // settings travel with the link: give ours, take what the machine kept
        mergeSettings(l.prefs(settingsBlob()))
        return l
    }

    private fun roomOf(l: Letter): String = (if (l.fromHost.startsWith("phone-")) l.toRepo else l.fromRepo).lowercase()

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
        top.addView(Button(this).apply { text = "Zemory"; setOnClickListener { showZemory() } })
        top.addView(Button(this).apply { text = "Chat"; setOnClickListener { showChat() } })
        top.addView(Button(this).apply { text = "+ Máy"; setOnClickListener { addMachine() } })
        root.addView(top)
        status = TextView(this).apply { setTextColor(Color.parseColor("#9AA4B2")); textSize = 12f }
        root.addView(status)
        body = FrameLayout(this)
        root.addView(body, LinearLayout.LayoutParams(MATCH_PARENT, 0, 1f))
        setContentView(root)
        room = prefs.getString("room", null)
        loadMachines()
        machine.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (onChat) showChat() else showZemory()
            }
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
        ui.removeCallbacks(pollApprovals)
    }

    @Deprecated("Activity result API kept on purpose: no AndroidX in this app")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != lockRequest) return
        if (resultCode == RESULT_OK) {
            unlockedAt = SystemClock.elapsedRealtime()
            pausedAt = 0
            if (onChat) showChat() else showZemory()
        } else finish()
    }

    override fun onPostResume() {
        super.onPostResume()
        // back from the background while already unlocked: the approvals poll picks up again
        if (onChat && !locked()) {
            ui.removeCallbacks(pollApprovals)
            ui.post(pollApprovals)
        }
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

    // ── tab Zemory: the machine's own interface ─────────────────────────────────────────────────────────
    @SuppressLint("SetJavaScriptEnabled")
    private fun showZemory() {
        onChat = false
        ui.removeCallbacks(pollApprovals)
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

    // ── tab Chat: one room per repo, every machine's letters merged ─────────────────────────────────────
    private fun showChat() {
        onChat = true
        if (locked()) return
        body.removeAllViews()
        val outer = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        approvalsBox = box
        shownApprovals.clear()
        outer.addView(box)
        val c = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        chat = c
        outer.addView(c, LinearLayout.LayoutParams(MATCH_PARENT, 0, 1f))
        body.addView(outer, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        ui.removeCallbacks(pollApprovals)
        ui.post(pollApprovals)
        val r = room
        if (r.isNullOrBlank()) showRooms() else showRoom(r)
    }

    /** Ask every machine for the permission prompts its agents are waiting on; one card per question. */
    private fun refreshApprovals() {
        io.execute {
            val found = ArrayList<Pair<Pairing, JSONObject>>()
            for (p in pairings()) runCatching {
                val a = JSONObject(link(p).request("GET", "/approvals").text).optJSONArray("pending") ?: JSONArray()
                for (i in 0 until a.length()) found.add(p to a.getJSONObject(i))
            }
            runOnUiThread {
                val box = approvalsBox ?: return@runOnUiThread
                val live = found.map { it.second.getString("id") }.toSet()
                // drop cards whose question is gone (answered elsewhere, or the dialog took over on the machine)
                for (i in box.childCount - 1 downTo 0) {
                    val v = box.getChildAt(i)
                    if (v.tag is String && v.tag !in live) {
                        box.removeViewAt(i)
                        shownApprovals.remove(v.tag as String)
                    }
                }
                for ((p, q) in found) {
                    val id = q.getString("id")
                    if (!shownApprovals.add(id)) continue
                    box.addView(approvalCard(p, q))
                }
            }
        }
    }

    private fun approvalCard(p: Pairing, q: JSONObject): View {
        val id = q.getString("id")
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            tag = id
            setBackgroundColor(Color.parseColor("#2A2312"))
            setPadding(dp(10), dp(8), dp(10), dp(8))
        }
        card.addView(TextView(this).apply {
            text = "Cần duyệt · ${q.optString("tool")} · ${q.optString("repo")}@${p.host}"
            setTextColor(Color.parseColor("#FFD166"))
            textSize = 12f
        })
        card.addView(TextView(this).apply {
            text = q.optString("summary")
            setTextColor(Color.WHITE)
            typeface = Typeface.MONOSPACE
            setTextIsSelectable(true)
        })
        val note = EditText(this).apply { hint = "Ghi chú cho agent (tuỳ chọn)"; setTextColor(Color.WHITE); setHintTextColor(Color.GRAY); textSize = 13f }
        card.addView(note)
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        fun answer(allow: Boolean) {
            val n = note.text.toString().trim()
            card.alpha = 0.5f
            io.execute {
                val r = runCatching {
                    link(p).request("POST", "/approval/answer?id=${java.net.URLEncoder.encode(id, "UTF-8")}&allow=${if (allow) 1 else 0}", n.toByteArray(), "text/plain;charset=UTF-8")
                }.getOrNull()
                val ok = r != null && runCatching { JSONObject(r.text).optBoolean("ok") }.getOrDefault(false)
                runOnUiThread {
                    status.text = if (ok) "${p.host}: đã ${if (allow) "cho phép" else "từ chối"}" else "${p.host}: câu hỏi không còn chờ (đã có người trả lời trên máy)"
                    approvalsBox?.removeView(card)
                }
            }
        }
        row.addView(Button(this).apply { text = "Cho phép"; setOnClickListener { answer(true) } }, LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f))
        row.addView(Button(this).apply { text = "Từ chối"; setOnClickListener { answer(false) } }, LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f))
        card.addView(row)
        return card
    }

    private fun showRooms() {
        val c = chat ?: return
        c.removeAllViews()
        status.text = "Đang lấy danh sách phòng…"
        io.execute {
            val rooms = sortedSetOf<String>()
            for (p in pairings()) runCatching {
                val a = JSONObject(link(p).request("GET", "/mail/thread").text).optJSONArray("repos") ?: JSONArray()
                for (i in 0 until a.length()) rooms.add(a.getString(i))
            }
            runOnUiThread {
                c.removeAllViews()
                status.text = if (rooms.isEmpty()) "Chưa có thư nào giữa các máy" else "Phòng chat"
                val field = EditText(this).apply { hint = "Mở phòng của repo (vd zemory)"; setSingleLine(); setTextColor(Color.WHITE); setHintTextColor(Color.GRAY) }
                c.addView(field)
                c.addView(Button(this).apply { text = "Mở phòng"; setOnClickListener { field.text.toString().trim().lowercase().ifBlank { null }?.let { openRoom(it) } } })
                for (name in rooms) c.addView(Button(this).apply { text = name; isAllCaps = false; setOnClickListener { openRoom(name) } })
            }
        }
    }

    private fun openRoom(name: String) {
        room = name
        prefs.edit().putString("room", name).apply()
        showRoom(name)
    }

    private fun showRoom(name: String) {
        val c = chat ?: return
        c.removeAllViews()
        val head = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        head.addView(Button(this).apply { text = "‹ Phòng"; setOnClickListener { room = null; prefs.edit().remove("room").apply(); showRooms() } })
        head.addView(TextView(this).apply { text = name; setTextColor(Color.WHITE); textSize = 16f; setPadding(dp(8), 0, 0, 0) }, LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f))
        c.addView(head)
        val list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val scroll = ScrollView(this).apply { addView(list) }
        c.addView(scroll, LinearLayout.LayoutParams(MATCH_PARENT, 0, 1f))
        val target = Spinner(this)
        val input = EditText(this).apply { hint = "Viết cho agent của $name…"; minLines = 2; setTextColor(Color.WHITE); setHintTextColor(Color.GRAY) }
        val send = Button(this).apply { text = "Gửi" }
        c.addView(target)
        c.addView(input)
        c.addView(send)
        status.text = "Đang tải phòng $name…"
        io.execute {
            // each machine's view of the room; a letter sits in the sender's outbox AND the receiver's inbox - keep one
            val seen = HashMap<String, JSONObject>()
            val hosts = ArrayList<String>()
            for (p in pairings()) runCatching {
                val a = JSONObject(link(p).request("GET", "/mail/thread?repo=${java.net.URLEncoder.encode(name, "UTF-8")}").text).optJSONArray("letters") ?: JSONArray()
                hosts.add(p.host)
                for (i in 0 until a.length()) {
                    val e = a.getJSONObject(i).getJSONObject("env")
                    seen.putIfAbsent(e.getString("id"), e)
                }
            }
            val letters = seen.values.sortedBy { it.optString("sentAt") }
            runOnUiThread {
                status.text = "$name · ${letters.size} thư · ${hosts.size} máy"
                for (e in letters) {
                    val from = e.getJSONObject("from")
                    val to = e.getJSONObject("to")
                    val mine = from.getString("host").startsWith("phone-")
                    val at = runCatching { clock.format(Instant.parse(e.optString("sentAt"))) }.getOrDefault("")
                    val who = if (mine) "Bạn → ${to.getString("host")}" else "${from.getString("repo")}@${from.getString("host")} → ${to.getString("repo")}@${to.getString("host")}"
                    list.addView(TextView(this).apply { text = "$who · $at"; textSize = 11f; setTextColor(Color.parseColor("#9AA4B2")); setPadding(0, dp(10), 0, 0) })
                    list.addView(TextView(this).apply {
                        text = e.optString("body")
                        setTextIsSelectable(true)
                        setTextColor(if (mine) Color.parseColor("#FFD166") else Color.WHITE)
                        if (!mine) typeface = Typeface.MONOSPACE
                    })
                }
                scroll.post { scroll.fullScroll(View.FOCUS_DOWN) }
                val choices = listOf("Mọi máy") + hosts
                target.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, choices)
                send.setOnClickListener {
                    val text = input.text.toString().trim()
                    if (text.isEmpty()) return@setOnClickListener
                    val to = if (target.selectedItemPosition == 0) pairings().filter { it.host in hosts } else pairings().filter { it.host == choices[target.selectedItemPosition] }
                    input.setText("")
                    status.text = "Đang gửi…"
                    io.execute {
                        val ok = to.map { p -> p.host to runCatching { link(p).mail(Letter.to(p, name, text)) }.getOrDefault(false) }
                        runOnUiThread {
                            status.text = ok.joinToString(" · ") { (h, y) -> if (y) "$h đã nhận" else "$h chưa nhận" }
                            showRoom(name)
                        }
                    }
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        links.values.forEach { it.close() }
        io.shutdown()
    }
}
