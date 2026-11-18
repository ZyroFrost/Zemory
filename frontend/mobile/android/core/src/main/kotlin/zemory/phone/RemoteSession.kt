package zemory.phone

import org.json.JSONObject
import java.io.DataInputStream
import java.net.Socket
import java.net.SocketTimeoutException
import java.time.Instant
import java.util.UUID
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocket

/** A letter as the daemon's mail store sees it (backend/src/memory/mail.ts `MailEnvelope`). */
data class Letter(val json: JSONObject) {
    val id: String get() = json.getString("id")
    val fromHost: String get() = json.getJSONObject("from").getString("host")
    val fromRepo: String get() = json.getJSONObject("from").getString("repo")
    val toRepo: String get() = json.getJSONObject("to").getString("repo")
    val body: String get() = json.getString("body")
    val sentAt: String get() = json.optString("sentAt")
    val replyTo: String? get() = json.optString("replyTo").ifBlank { null }

    companion object {
        fun to(p: Pairing, repo: String, body: String, replyTo: String? = null): Letter {
            val j = JSONObject()
                .put("id", UUID.randomUUID().toString())
                .put("from", JSONObject().put("host", p.phoneHost).put("repo", "phone"))
                .put("to", JSONObject().put("host", p.host).put("repo", repo))
                .put("subject", body.lineSequence().first().take(120))
                .put("body", body)
                .put("sentAt", Instant.now().toString())
            if (replyTo != null) j.put("replyTo", replyTo)
            return Letter(j)
        }
    }
}

/** How a session went, for the screen and for the test runner. */
data class Outcome(
    val via: String,
    val connectedMs: Long,
    val acked: List<String>,
    val received: List<Letter>,
    val error: String? = null,
)

/**
 * One mail-only session with one machine (plan/41 §4): pin the machine's fingerprint, `hello{role:"remote"}`, mutual proof
 * keyed by the pairing token, send the queued letters, take the machine's letters (acking each), until `holdMs` passes.
 */
class RemoteSession(private val p: Pairing, private val id: Identity, private val log: (String) -> Unit = {}) {
    private val ctx: SSLContext = Tls.context(id)

    /** Direct address (same LAN, or a test against a local daemon). */
    fun direct(host: String, port: Int, send: List<Letter>, holdMs: Long): Outcome {
        val t0 = System.currentTimeMillis()
        val s = try {
            Tls.client(ctx, null, host, port, tls13Only = true, timeoutMs = 10_000)
        } catch (e: Exception) {
            return Outcome("direct", 0, emptyList(), emptyList(), "cannot reach $host:$port (${e.message})")
        }
        return exchange(s, "direct", t0, send, holdMs)
    }

    /**
     * Through the relay the machine waits on. `relayUrl` null = ask global discovery for it (what the phone does away from
     * home: it cannot read the presence files on Drive).
     */
    fun relay(relayUrl: String?, send: List<Letter>, holdMs: Long): Outcome {
        val t0 = System.currentTimeMillis()
        val urls = if (relayUrl != null) listOf(relayUrl) else Discovery.relays(p.fp, ctx)
        if (urls.isEmpty()) return Outcome("relay", 0, emptyList(), emptyList(), "${p.host} announced no relay (is its daemon on?)")
        for (u in urls) {
            val ep = Relay.parseUrl(u) ?: continue
            val inv = Relay.requestSession(ep, ctx, p.fp)
            if (inv == null) {
                log("relay ${ep.host}: does not know ${p.host}")
                continue
            }
            val raw: Socket = Relay.joinSession(ep, inv) ?: continue
            log("relay ${ep.host}: session open after ${System.currentTimeMillis() - t0} ms")
            val s = try {
                Tls.client(ctx, raw, ep.host, ep.port, tls13Only = true, timeoutMs = 10_000)
            } catch (e: Exception) {
                log("relay ${ep.host}: TLS failed (${e.message})")
                continue
            }
            return exchange(s, "relay ${ep.host}", t0, send, holdMs)
        }
        return Outcome("relay", 0, emptyList(), emptyList(), "no relay reached ${p.host}")
    }

    private fun exchange(s: SSLSocket, via: String, t0: Long, send: List<Letter>, holdMs: Long): Outcome {
        val acked = ArrayList<String>()
        val got = ArrayList<Letter>()
        s.use {
            val peer = DeviceId.fromDer(Tls.peerDer(s))
            if (!DeviceId.same(peer, p.fp)) return Outcome(via, 0, acked, got, "not ${p.host}: fingerprint $peer")
            val out = s.outputStream
            val inp = DataInputStream(s.inputStream)
            val myNonce = Wire.nonce()
            var serverNonce = ""
            var proven = false
            var connectedMs = 0L
            Wire.write(
                out,
                JSONObject().put("t", "hello").put("deviceId", id.deviceId).put("appVersion", "zemory-phone")
                    .put("nonce", myNonce).put("initiator", true).put("name", p.name).put("mail", true)
                    .put("proto", Wire.PROTO).put("role", "remote"),
            )
            s.soTimeout = 1_000
            val deadline = System.currentTimeMillis() + holdMs
            while (System.currentTimeMillis() < deadline) {
                val (kind, body) = try {
                    Wire.read(inp)
                } catch (e: SocketTimeoutException) {
                    continue
                } catch (e: Exception) {
                    return Outcome(via, connectedMs, acked, got, if (proven) null else "the machine closed the session (not paired, or wrong token)")
                }
                if (kind != Wire.FRAME_JSON) continue
                val m = JSONObject(String(body, Charsets.UTF_8))
                when (m.optString("t")) {
                    "hello" -> {
                        serverNonce = m.getString("nonce")
                        Wire.write(out, JSONObject().put("t", "proof").put("hmac", Wire.proof(p.token, myNonce, serverNonce)))
                    }
                    "proof" -> {
                        // mutual: the machine proves it holds the same token - a look-alike that only copied the
                        // fingerprint cannot read what the phone sends
                        if (!Wire.proofMatches(Wire.proof(p.token, myNonce, serverNonce), m.getString("hmac"))) {
                            return Outcome(via, 0, acked, got, "the machine failed its proof")
                        }
                        proven = true
                        connectedMs = System.currentTimeMillis() - t0
                        log("connected to ${p.host} via $via in $connectedMs ms")
                        for (l in send) Wire.write(out, JSONObject().put("t", "mail").put("m", l.json))
                    }
                    "mail" -> {
                        val l = Letter(m.getJSONObject("m"))
                        got.add(l)
                        Wire.write(out, JSONObject().put("t", "mailack").put("id", l.id))
                        log("letter from ${l.fromHost}/${l.fromRepo}: ${l.body.take(80)}")
                    }
                    "mailack" -> acked.add(m.getString("id"))
                    "ping" -> Wire.write(out, JSONObject().put("t", "pong"))
                }
            }
            return Outcome(via, connectedMs, acked, got, if (proven) null else "no proof from the machine within ${holdMs / 1000} s")
        }
    }
}
