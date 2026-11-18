package zemory.phone

import org.json.JSONObject
import java.net.URL
import java.net.URLEncoder
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext

/** Where a machine waits right now: Syncthing global discovery, where the daemon announces itself (globaldisco.ts). */
object Discovery {
    private val SERVERS = listOf(
        "https://discovery.syncthing.net/v2/",
        "https://discovery-v4.syncthing.net/v2/",
    )

    /** Relay addresses (`relay://...`) the machine announced; empty when none answered. */
    fun relays(machineId: String, ctx: SSLContext, timeoutMs: Int = 6_000): List<String> {
        val id = DeviceId.toSyncthing(machineId) ?: return emptyList()
        for (server in SERVERS) {
            try {
                val c = URL("$server?device=${URLEncoder.encode(id, "UTF-8")}").openConnection() as HttpsURLConnection
                // the answer is only a hint: a wrong address fails the fingerprint pin, so no CA is consulted here either
                c.sslSocketFactory = ctx.socketFactory
                c.hostnameVerifier = javax.net.ssl.HostnameVerifier { _, _ -> true }
                c.connectTimeout = timeoutMs
                c.readTimeout = timeoutMs
                if (c.responseCode != 200) continue
                val j = JSONObject(c.inputStream.bufferedReader().readText())
                val a = j.optJSONArray("addresses") ?: continue
                val out = (0 until a.length()).map { a.getString(it) }.filter { it.startsWith("relay://") }
                if (out.isNotEmpty()) return out
            } catch (e: Exception) {
                // next server
            }
        }
        return emptyList()
    }
}
