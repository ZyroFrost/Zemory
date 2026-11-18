package zemory.phone

import org.json.JSONObject
import java.io.DataInputStream
import java.io.OutputStream
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/** Channel frames (backend/src/memory/channel/wire.ts): 1 byte kind · 4 bytes big-endian length · body. */
object Wire {
    const val FRAME_JSON = 0
    const val PROTO = 2
    private const val MAX = 8 * 1024 * 1024 // a phone only ever sees control frames and letters (<= 256 KB)

    fun write(out: OutputStream, msg: JSONObject) {
        val body = msg.toString().toByteArray(Charsets.UTF_8)
        val head = ByteArray(5)
        head[0] = FRAME_JSON.toByte()
        head[1] = (body.size ushr 24).toByte()
        head[2] = (body.size ushr 16).toByte()
        head[3] = (body.size ushr 8).toByte()
        head[4] = body.size.toByte()
        synchronized(out) {
            out.write(head)
            out.write(body)
            out.flush()
        }
    }

    /** One frame; `null` body kind != JSON is returned as-is for the caller to skip. */
    fun read(inp: DataInputStream): Pair<Int, ByteArray> {
        val kind = inp.readUnsignedByte()
        val len = inp.readInt()
        require(len in 0..MAX) { "frame too large: $len" }
        val body = ByteArray(len)
        inp.readFully(body)
        return kind to body
    }

    fun nonce(): String = Base64.getEncoder().encodeToString(ByteArray(32).also { SecureRandom().nextBytes(it) })

    /** HMAC-SHA256 over "<initiator nonce>|<responder nonce>", keyed by the UTF-8 of the secret (Node `createHmac`). */
    fun proof(secret: String, initiatorNonce: String, responderNonce: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return Base64.getEncoder().encodeToString(mac.doFinal("$initiatorNonce|$responderNonce".toByteArray(Charsets.UTF_8)))
    }

    fun proofMatches(expected: String, got: String): Boolean = try {
        java.security.MessageDigest.isEqual(Base64.getDecoder().decode(expected), Base64.getDecoder().decode(got))
    } catch (e: IllegalArgumentException) {
        false
    }
}
