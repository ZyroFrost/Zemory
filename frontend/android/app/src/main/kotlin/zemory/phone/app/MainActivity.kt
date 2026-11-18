package zemory.phone.app

import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject
import zemory.phone.Identity
import zemory.phone.Letter
import zemory.phone.Pairing
import zemory.phone.RemoteSession
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * One screen (plan/41 §6): pick a machine, type the work, send; replies show under it. The relay is the path; a letter
 * the machine could not take is kept and sent again on the next send or refresh.
 */
class MainActivity : Activity() {
    private val prefs by lazy { getSharedPreferences("zemory", Context.MODE_PRIVATE) }
    private val identity by lazy { Identity.loadOrCreate(filesDir, "phone") }
    private lateinit var machine: Spinner
    private lateinit var repo: EditText
    private lateinit var input: EditText
    private lateinit var thread: LinearLayout
    private lateinit var status: TextView
    private lateinit var send: Button
    private lateinit var refresh: Button
    private val clock = DateTimeFormatter.ofPattern("dd/MM HH:mm").withZone(ZoneId.systemDefault())

    private fun pairings(): List<Pairing> = JSONArray(prefs.getString("pairings", "[]")).let { a ->
        (0 until a.length()).mapNotNull { Pairing.parse(a.getString(it)) }
    }

    private fun current(): Pairing? = pairings().getOrNull(machine.selectedItemPosition)

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(24), dp(16), dp(16))
            setBackgroundColor(Color.parseColor("#111418"))
        }
        val top = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        machine = Spinner(this)
        top.addView(machine, LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f))
        top.addView(Button(this).apply { text = "+ Máy"; setOnClickListener { addMachine() } })
        root.addView(top)

        repo = EditText(this).apply { hint = "repo (vd zemory)"; setText(prefs.getString("repo", "zemory")); setSingleLine(); setTextColor(Color.WHITE); setHintTextColor(Color.GRAY) }
        root.addView(repo)

        status = TextView(this).apply { setTextColor(Color.parseColor("#9AA4B2")); textSize = 12f }
        root.addView(status)

        thread = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(ScrollView(this).apply { addView(thread) }, LinearLayout.LayoutParams(MATCH_PARENT, 0, 1f))

        input = EditText(this).apply { hint = "Giao việc cho agent…"; minLines = 2; setTextColor(Color.WHITE); setHintTextColor(Color.GRAY) }
        root.addView(input)
        val actions = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        send = Button(this).apply { text = "Gửi"; setOnClickListener { sendNow() } }
        refresh = Button(this).apply { text = "Làm mới"; setOnClickListener { exchange(emptyList()) } }
        actions.addView(send, LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f))
        actions.addView(refresh, LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f))
        root.addView(actions)
        setContentView(root)

        machine.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) = render()
            override fun onNothingSelected(parent: AdapterView<*>?) = render()
        }
        loadMachines()
    }

    private fun loadMachines() {
        val list = pairings()
        machine.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, list.map { it.host }.ifEmpty { listOf("Chưa có máy — bấm + Máy") })
        send.isEnabled = list.isNotEmpty()
        refresh.isEnabled = list.isNotEmpty()
        render()
    }

    private fun addMachine() {
        val field = EditText(this).apply { hint = "zph1.… (zemory phone pair <tên>)" }
        AlertDialog.Builder(this).setTitle("Thêm máy").setView(field)
            .setPositiveButton("Thêm") { _, _ ->
                val p = Pairing.parse(field.text.toString())
                if (p == null) {
                    status.text = "Mã ghép đôi không đọc được"
                    return@setPositiveButton
                }
                val codes = JSONArray(prefs.getString("pairings", "[]"))
                val kept = JSONArray()
                for (i in 0 until codes.length()) if (Pairing.parse(codes.getString(i))?.host != p.host) kept.put(codes.getString(i))
                kept.put(field.text.toString().trim())
                prefs.edit().putString("pairings", kept.toString()).apply()
                loadMachines()
                machine.setSelection(pairings().indexOfFirst { it.host == p.host })
            }
            .setNegativeButton("Huỷ", null).show()
    }

    // ── the thread of one machine: sent letters (with delivered state) and received ones ──
    private fun history(host: String): JSONArray = JSONArray(prefs.getString("thread:$host", "[]"))
    private fun saveHistory(host: String, a: JSONArray) = prefs.edit().putString("thread:$host", a.toString()).apply()

    private fun render() {
        thread.removeAllViews()
        val p = current() ?: return
        val a = history(p.host)
        for (i in 0 until a.length()) {
            val e = a.getJSONObject(i)
            val l = Letter(e.getJSONObject("letter"))
            val mine = e.getString("dir") == "out"
            val when_ = runCatching { clock.format(Instant.parse(l.sentAt)) }.getOrDefault("")
            val head = if (mine) "Bạn → ${l.toRepo} · $when_ · ${if (e.optBoolean("acked")) "đã tới máy" else "đang chờ gửi"}" else "${l.fromRepo} · $when_"
            thread.addView(TextView(this).apply { text = head; textSize = 11f; setTextColor(Color.parseColor("#9AA4B2")); setPadding(0, dp(10), 0, 0) })
            thread.addView(TextView(this).apply {
                text = l.body
                setTextIsSelectable(true)
                setTextColor(if (mine) Color.parseColor("#FFD166") else Color.WHITE)
                if (!mine) typeface = Typeface.MONOSPACE
            })
        }
    }

    private fun sendNow() {
        val p = current() ?: return
        val body = input.text.toString().trim()
        val r = repo.text.toString().trim()
        if (body.isEmpty() || r.isEmpty()) return
        prefs.edit().putString("repo", r).apply()
        val l = Letter.to(p, r, body)
        val a = history(p.host)
        a.put(JSONObject().put("dir", "out").put("letter", l.json).put("acked", false))
        saveHistory(p.host, a)
        input.setText("")
        render()
        exchange(listOf(l))
    }

    /** Connect, send `fresh` plus anything not yet delivered, take the machine's letters. */
    private fun exchange(fresh: List<Letter>) {
        val p = current() ?: return
        val a = history(p.host)
        val owed = (0 until a.length()).map { a.getJSONObject(it) }.filter { it.getString("dir") == "out" && !it.optBoolean("acked") }
            .map { Letter(it.getJSONObject("letter")) }
        val outgoing = (owed + fresh).distinctBy { it.id }
        send.isEnabled = false
        refresh.isEnabled = false
        status.text = "Đang nối tới ${p.host}…"
        Thread {
            val o = runCatching { RemoteSession(p, identity).relay(null, outgoing, 8_000) }.getOrElse { e ->
                zemory.phone.Outcome("relay", 0, emptyList(), emptyList(), e.message ?: e.javaClass.simpleName)
            }
            runOnUiThread {
                val h = history(p.host)
                val acked = o.acked.toSet()
                for (i in 0 until h.length()) {
                    val e = h.getJSONObject(i)
                    if (e.getString("dir") == "out" && Letter(e.getJSONObject("letter")).id in acked) e.put("acked", true)
                }
                val have = (0 until h.length()).map { Letter(h.getJSONObject(it).getJSONObject("letter")).id }.toSet()
                for (l in o.received) if (l.id !in have) h.put(JSONObject().put("dir", "in").put("letter", l.json))
                saveHistory(p.host, h)
                status.text = o.error?.let { "Không nối được: $it" }
                    ?: "Đã nối ${p.host} (${o.connectedMs} ms) · gửi ${o.acked.size} · nhận ${o.received.size}"
                send.isEnabled = true
                refresh.isEnabled = true
                render()
            }
        }.start()
    }
}
