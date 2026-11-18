package zemory.phone

import org.json.JSONObject
import java.io.DataInputStream
import java.net.SocketTimeoutException
import java.util.Base64
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocket

/** One answer of the machine's UI API. */
class Reply(val status: Int, val type: String, val body: ByteArray) {
    val text: String get() = String(body, Charsets.UTF_8)
}

/**
 * A LIVE link to one machine (plan/41 §6a): one connection carrying the UI's calls (`req`/`res`, many in flight), the
 * phone's settings (`prefs`) and mail both ways. `open` returns once both sides proved the pairing token; the link stays
 * up until [close] or the network drops it (then [alive] turns false and the caller opens a new one).
 */
class Link private constructor(
    private val p: Pairing,
    private val sock: SSLSocket,
    val via: String,
    private val onMail: (Letter) -> Unit,
) {
    private val out = sock.outputStream
    private val pending = ConcurrentHashMap<String, CompletableFuture<Reply>>()
    private val acks = ConcurrentHashMap<String, CompletableFuture<Boolean>>()
    @Volatile private var prefsWait: CompletableFuture<String?>? = null
    private val seq = AtomicLong()
    @Volatile var alive = true
        private set
    @Volatile private var lastHeard = System.currentTimeMillis()

    private fun send(m: JSONObject) = Wire.write(out, m)

    /** One UI API call, blocking up to [timeoutMs]. Network loss answers 502 rather than throwing. */
    fun request(method: String, path: String, body: ByteArray? = null, type: String? = null, timeoutMs: Long = 60_000, host: String? = null): Reply {
        if (!alive) return Reply(502, "text/plain", "link closed".toByteArray())
        val id = "q${seq.incrementAndGet()}"
        val f = CompletableFuture<Reply>()
        pending[id] = f
        val m = JSONObject().put("t", "req").put("id", id).put("method", method).put("path", path)
        if (body != null && body.isNotEmpty()) m.put("body", Base64.getEncoder().encodeToString(body))
        if (!type.isNullOrBlank()) m.put("type", type)
        // another machine of the cluster, reached through this one's live link to it (plan/41 §6f)
        if (!host.isNullOrBlank()) m.put("host", host)
        return try {
            send(m)
            f.get(timeoutMs, TimeUnit.MILLISECONDS)
        } catch (e: Exception) {
            Reply(504, "text/plain", "no answer from ${p.host}".toByteArray())
        } finally {
            pending.remove(id)
        }
    }

    /** Send a letter; true once the machine stored it. */
    fun mail(l: Letter, timeoutMs: Long = 20_000): Boolean {
        val f = CompletableFuture<Boolean>()
        acks[l.id] = f
        return try {
            send(JSONObject().put("t", "mail").put("m", l.json))
            f.get(timeoutMs, TimeUnit.MILLISECONDS)
        } catch (e: Exception) {
            false
        } finally {
            acks.remove(l.id)
        }
    }

    /** Settings kept on the machine for this phone: give `data` to store it; returns what the machine holds. */
    fun prefs(data: String? = null, timeoutMs: Long = 15_000): String? {
        val f = CompletableFuture<String?>()
        prefsWait = f
        val m = JSONObject().put("t", "prefs")
        if (data != null) m.put("data", data)
        send(m)
        return try { f.get(timeoutMs, TimeUnit.MILLISECONDS) } catch (e: Exception) { null }
    }

    fun close() {
        alive = false
        try { sock.close() } catch (e: Exception) {}
        pending.values.forEach { it.complete(Reply(502, "text/plain", "link closed".toByteArray())) }
    }

    private fun readLoop(inp: DataInputStream) {
        try {
            while (alive) {
                val (kind, body) = try {
                    Wire.read(inp)
                } catch (e: SocketTimeoutException) {
                    // keepalive: a silent link is checked, a dead one is noticed within ~90 s
                    if (System.currentTimeMillis() - lastHeard > 90_000) break
                    if (System.currentTimeMillis() - lastHeard > 25_000) send(JSONObject().put("t", "ping"))
                    continue
                }
                lastHeard = System.currentTimeMillis()
                if (kind != Wire.FRAME_JSON) continue
                val m = JSONObject(String(body, Charsets.UTF_8))
                when (m.optString("t")) {
                    "res" -> pending[m.getString("id")]?.complete(
                        Reply(m.getInt("status"), m.optString("type", "application/octet-stream"), Base64.getDecoder().decode(m.optString("body", ""))),
                    )
                    "mail" -> {
                        val l = Letter(m.getJSONObject("m"))
                        send(JSONObject().put("t", "mailack").put("id", l.id))
                        try { onMail(l) } catch (e: Exception) {}
                    }
                    "mailack" -> acks[m.getString("id")]?.complete(true)
                    "prefs" -> prefsWait?.complete(if (m.has("data")) m.getString("data") else null)
                    "ping" -> send(JSONObject().put("t", "pong"))
                }
            }
        } catch (e: Exception) {
            // dropped
        } finally {
            close()
        }
    }

    companion object {
        /**
         * Open a link: relay first (works from anywhere), or a direct `host:port` when given. Throws with a sentence the
         * screen can show when no path reaches the machine.
         */
        fun open(p: Pairing, id: Identity, direct: String? = null, onMail: (Letter) -> Unit = {}, log: (String) -> Unit = {}): Link {
            val ctx: SSLContext = Tls.context(id)
            val (sock, via) = if (direct != null) {
                Tls.client(ctx, null, direct.substringBefore(":"), direct.substringAfter(":").toInt(), tls13Only = true, timeoutMs = 10_000) to "direct"
            } else viaRelay(p, ctx, log)
            val peer = DeviceId.fromDer(Tls.peerDer(sock))
            if (!DeviceId.same(peer, p.fp)) {
                sock.close()
                throw IllegalStateException("this is not ${p.host} (fingerprint $peer)")
            }
            val out = sock.outputStream
            val inp = DataInputStream(sock.inputStream)
            val myNonce = Wire.nonce()
            Wire.write(
                out,
                JSONObject().put("t", "hello").put("deviceId", id.deviceId).put("appVersion", "zemory-phone")
                    .put("nonce", myNonce).put("initiator", true).put("name", p.name).put("mail", true)
                    .put("proto", Wire.PROTO).put("role", "remote"),
            )
            sock.soTimeout = 15_000
            var serverNonce = ""
            while (true) {
                val (kind, body) = try { Wire.read(inp) } catch (e: Exception) {
                    sock.close()
                    throw IllegalStateException("${p.host} closed the link - this phone is not paired there (or the pairing was revoked)")
                }
                if (kind != Wire.FRAME_JSON) continue
                val m = JSONObject(String(body, Charsets.UTF_8))
                when (m.optString("t")) {
                    "hello" -> {
                        serverNonce = m.getString("nonce")
                        Wire.write(out, JSONObject().put("t", "proof").put("hmac", Wire.proof(p.token, myNonce, serverNonce)))
                    }
                    "proof" -> {
                        if (!Wire.proofMatches(Wire.proof(p.token, myNonce, serverNonce), m.getString("hmac"))) {
                            sock.close()
                            throw IllegalStateException("${p.host} failed its proof")
                        }
                        sock.soTimeout = 5_000
                        val link = Link(p, sock, via, onMail)
                        Thread({ link.readLoop(inp) }, "zemory-link-${p.host}").apply { isDaemon = true }.start()
                        log("connected to ${p.host} via $via")
                        return link
                    }
                }
            }
        }

        private fun viaRelay(p: Pairing, ctx: SSLContext, log: (String) -> Unit): Pair<SSLSocket, String> {
            val urls = Discovery.relays(p.fp, ctx)
            if (urls.isEmpty()) throw IllegalStateException("${p.host} is not online (no relay announced)")
            for (u in urls) {
                val ep = Relay.parseUrl(u) ?: continue
                val inv = Relay.requestSession(ep, ctx, p.fp) ?: run { log("relay ${ep.host}: ${p.host} not there"); null } ?: continue
                val raw = Relay.joinSession(ep, inv) ?: continue
                val s = try {
                    Tls.client(ctx, raw, ep.host, ep.port, tls13Only = true, timeoutMs = 10_000)
                } catch (e: Exception) {
                    log("relay ${ep.host}: TLS failed (${e.message})")
                    continue
                }
                return s to "relay ${ep.host}"
            }
            throw IllegalStateException("no relay reached ${p.host}")
        }
    }
}
