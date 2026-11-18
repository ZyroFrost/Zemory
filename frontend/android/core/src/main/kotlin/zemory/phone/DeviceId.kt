package zemory.phone

import java.security.MessageDigest

/** Device fingerprints exactly as the daemon writes them (backend/src/memory/channel/identity.ts). */
object DeviceId {
    private const val B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

    fun base32(buf: ByteArray): String {
        var bits = 0
        var value = 0
        val out = StringBuilder()
        for (b in buf) {
            value = (value shl 8) or (b.toInt() and 0xff)
            bits += 8
            while (bits >= 5) {
                out.append(B32[(value ushr (bits - 5)) and 31])
                bits -= 5
            }
        }
        if (bits > 0) out.append(B32[(value shl (5 - bits)) and 31])
        return out.toString()
    }

    fun unbase32(s: String): ByteArray? {
        var bits = 0
        var value = 0
        val out = ArrayList<Byte>()
        for (ch in s) {
            val idx = B32.indexOf(ch)
            if (idx < 0) return null
            value = (value shl 5) or idx
            bits += 5
            if (bits >= 8) {
                out.add(((value ushr (bits - 8)) and 0xff).toByte())
                bits -= 8
            }
        }
        return out.toByteArray()
    }

    fun luhn32(group: String): Char {
        val n = B32.length
        var factor = 1
        var sum = 0
        for (ch in group) {
            val cp = B32.indexOf(ch)
            require(cp >= 0) { "not base32: $ch" }
            var add = factor * cp
            factor = if (factor == 2) 1 else 2
            add = add / n + add % n
            sum += add
        }
        return B32[(n - sum % n) % n]
    }

    fun fromDer(der: ByteArray): String {
        val raw = base32(MessageDigest.getInstance("SHA-256").digest(der))
        return raw.chunked(7).joinToString("-") { it + luhn32(it) }
    }

    private fun stripChecksum(flat: String): String? {
        val out = StringBuilder()
        var i = 0
        while (i < flat.length) {
            val take = minOf(8, flat.length - i)
            if (take < 2) return null
            val body = flat.substring(i, i + take - 1)
            val ok = try { luhn32(body) == flat[i + take - 1] } catch (e: IllegalArgumentException) { false }
            if (!ok) return null
            out.append(body)
            i += take
        }
        return out.toString()
    }

    fun normalize(id: String): String {
        val flat = id.replace(Regex("[^A-Za-z0-9]"), "").uppercase()
        return stripChecksum(flat) ?: flat
    }

    fun same(a: String, b: String): Boolean = normalize(a).isNotEmpty() && normalize(a) == normalize(b)

    /** The 32 raw bytes of an id (what the relay protocol addresses). */
    fun bytes(id: String): ByteArray? {
        val flat = stripChecksum(id.replace(Regex("[^A-Za-z0-9]"), "").uppercase()) ?: return null
        val b = unbase32(flat) ?: return null
        return if (b.size >= 32) b.copyOf(32) else null
    }

    /** The Syncthing form of an id, which global discovery is keyed by (globaldisco.ts `toSyncthingId`). */
    fun toSyncthing(id: String): String? {
        val raw = normalize(id)
        if (raw.length != 52) return null
        val luhnified = raw.chunked(13).joinToString("") { it + luhn32(it) }
        return luhnified.chunked(7).joinToString("-")
    }
}
