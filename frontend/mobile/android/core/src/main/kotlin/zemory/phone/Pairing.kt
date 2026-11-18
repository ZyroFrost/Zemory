package zemory.phone

import org.json.JSONObject
import java.util.Base64

/** What `zemory phone pair <name>` prints: `zph1.<base64url JSON>` (backend/src/memory/phone.ts `pairingCode`). */
data class Pairing(val name: String, val host: String, val fp: String, val token: String) {
    /** The mail host this phone writes from and is written to. */
    val phoneHost: String get() = "phone-$name"

    companion object {
        private val NAME = Regex("^[a-z0-9][a-z0-9-]{0,31}$")

        fun parse(code: String): Pairing? {
            val m = Regex("^zph1\\.([A-Za-z0-9_-]+)$").find(code.trim()) ?: return null
            return try {
                val j = JSONObject(String(Base64.getUrlDecoder().decode(m.groupValues[1]), Charsets.UTF_8))
                if (j.optInt("v") != 1) return null
                val p = Pairing(j.getString("name"), j.getString("host"), j.getString("fp"), j.getString("token"))
                if (!NAME.matches(p.name) || p.host.isBlank() || p.fp.isBlank() || p.token.isBlank()) null else p
            } catch (e: Exception) {
                null
            }
        }
    }
}
