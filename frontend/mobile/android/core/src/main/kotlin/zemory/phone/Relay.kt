package zemory.phone

import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.EOFException
import java.net.InetSocketAddress
import java.net.Socket
import java.net.URI
import javax.net.ssl.SSLContext

/**
 * Client side of the Syncthing relay protocol (backend/src/memory/channel/relaypool.ts): ask a relay for a session to a
 * device, then join that session over plain TCP. The relay is only a pipe - our own TLS runs inside it.
 */
object Relay {
    private const val MAGIC = 0x9e79bc40.toInt()
    private const val PING = 0
    private const val PONG = 1
    private const val JOIN_SESSION = 3
    private const val RESPONSE = 4
    private const val CONNECT = 5
    private const val INVITE = 6
    private const val MAX = 64 * 1024

    data class Endpoint(val host: String, val port: Int, val url: String)
    data class Invitation(val key: ByteArray, val host: String?, val port: Int, val serverSocket: Boolean)

    fun parseUrl(raw: String): Endpoint? {
        val s = raw.trim()
        if (!s.startsWith("relay://")) return null
        return try {
            val u = URI("http://" + s.removePrefix("relay://"))
            val port = if (u.port > 0) u.port else 22067
            if (u.host.isNullOrBlank()) null else Endpoint(u.host, port, s)
        } catch (e: Exception) {
            null
        }
    }

    private fun frame(type: Int, body: ByteArray): ByteArray {
        val b = ByteArrayOutputStream()
        fun int(v: Int) = b.write(byteArrayOf((v ushr 24).toByte(), (v ushr 16).toByte(), (v ushr 8).toByte(), v.toByte()))
        int(MAGIC)
        int(type)
        int(body.size)
        b.write(body)
        return b.toByteArray()
    }

    private fun bytesField(v: ByteArray): ByteArray {
        val pad = (4 - v.size % 4) % 4
        val b = ByteArrayOutputStream()
        b.write(byteArrayOf((v.size ushr 24).toByte(), (v.size ushr 16).toByte(), (v.size ushr 8).toByte(), v.size.toByte()))
        b.write(v)
        b.write(ByteArray(pad))
        return b.toByteArray()
    }

    /** Reads exactly one relay frame - never a byte more (after `Response` the bytes belong to TLS). */
    private fun readFrame(inp: DataInputStream): Pair<Int, ByteArray> {
        if (inp.readInt() != MAGIC) throw EOFException("not a relay frame")
        val type = inp.readInt()
        val len = inp.readInt()
        require(len in 0..MAX) { "relay frame too large" }
        val body = ByteArray(len)
        inp.readFully(body)
        return type to body
    }

    private fun parseInvitation(body: ByteArray): Invitation? = try {
        var off = 0
        fun u32(): Int {
            val v = ((body[off].toInt() and 0xff) shl 24) or ((body[off + 1].toInt() and 0xff) shl 16) or
                ((body[off + 2].toInt() and 0xff) shl 8) or (body[off + 3].toInt() and 0xff)
            off += 4
            return v
        }
        fun take(): ByteArray {
            val n = u32()
            require(n in 0..MAX && off + n <= body.size)
            val v = body.copyOfRange(off, off + n)
            off += n + (4 - n % 4) % 4
            return v
        }
        take() // from
        val key = take()
        val addr = take()
        val port = u32()
        val server = u32() != 0
        val host = if (addr.size == 4) addr.joinToString(".") { (it.toInt() and 0xff).toString() } else null
        if (key.isEmpty() || port <= 0 || port > 65535) null else Invitation(key, host, port, server)
    } catch (e: Exception) {
        null
    }

    /** `null` = the relay does not know the device (it is not waiting on THIS relay) or the network is silent. */
    fun requestSession(ep: Endpoint, ctx: SSLContext, peerId: String, timeoutMs: Int = 10_000): Invitation? {
        val id = DeviceId.bytes(peerId) ?: return null
        val s = try {
            Tls.client(ctx, null, ep.host, ep.port, tls13Only = false, timeoutMs = timeoutMs)
        } catch (e: Exception) {
            return null
        }
        s.use {
            it.outputStream.write(frame(CONNECT, bytesField(id)))
            it.outputStream.flush()
            val inp = DataInputStream(it.inputStream)
            val deadline = System.currentTimeMillis() + timeoutMs
            while (System.currentTimeMillis() < deadline) {
                val (type, body) = try { readFrame(inp) } catch (e: Exception) { return null }
                when (type) {
                    INVITE -> return parseInvitation(body)
                    RESPONSE -> if (body.size < 4 || body.take(4).any { b -> b != 0.toByte() }) return null
                    PING -> it.outputStream.write(frame(PONG, ByteArray(0)))
                }
            }
            return null
        }
    }

    /** The raw pipe of an invited session, ready for our TLS on top. */
    fun joinSession(ep: Endpoint, inv: Invitation, timeoutMs: Int = 10_000): Socket? {
        val s = Socket()
        return try {
            s.connect(InetSocketAddress(inv.host ?: ep.host, inv.port), timeoutMs)
            s.soTimeout = timeoutMs
            s.getOutputStream().write(frame(JOIN_SESSION, bytesField(inv.key)))
            s.getOutputStream().flush()
            val (type, body) = readFrame(DataInputStream(s.getInputStream()))
            if (type != RESPONSE || body.size < 4 || body.take(4).any { it != 0.toByte() }) {
                s.close()
                null
            } else s
        } catch (e: Exception) {
            s.close()
            null
        }
    }
}
