package zemory.phone

import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.bouncycastle.jsse.provider.BouncyCastleJsseProvider
import java.net.Socket
import java.security.KeyStore
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.KeyManagerFactory
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocket
import javax.net.ssl.X509TrustManager

/**
 * TLS for the channel and the relay, on BouncyCastle JSSE: the channel's certificates are Ed25519 and the platform TLS of
 * a phone cannot be relied on to speak them. No CA decides anything - the caller pins the peer's fingerprint after the
 * handshake (the same rule as the daemon: `rejectUnauthorized: false` + own fingerprint check).
 */
object Tls {
    private val jsse = BouncyCastleJsseProvider()

    init {
        Bc.install()
    }

    private val acceptAny = object : X509TrustManager {
        override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
        override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
        override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
    }

    fun context(id: Identity): SSLContext {
        val pw = "zemory".toCharArray()
        val ks = KeyStore.getInstance("PKCS12", BouncyCastleProvider.PROVIDER_NAME)
        ks.load(null, null)
        ks.setKeyEntry("phone", id.key, pw, arrayOf(id.cert))
        val kmf = KeyManagerFactory.getInstance("PKIX", jsse)
        kmf.init(ks, pw)
        val ctx = SSLContext.getInstance("TLS", jsse)
        ctx.init(kmf.keyManagers, arrayOf(acceptAny), SecureRandom())
        return ctx
    }

    /** Client handshake, over `raw` when given (a relayed pipe) or a fresh TCP connection. */
    fun client(ctx: SSLContext, raw: Socket?, host: String, port: Int, tls13Only: Boolean, timeoutMs: Int): SSLSocket {
        val f = ctx.socketFactory
        val s = (if (raw != null) f.createSocket(raw, host, port, true) else f.createSocket(host, port)) as SSLSocket
        s.soTimeout = timeoutMs
        s.useClientMode = true
        if (tls13Only) s.enabledProtocols = arrayOf("TLSv1.3")
        s.startHandshake()
        return s
    }

    fun peerDer(s: SSLSocket): ByteArray = s.session.peerCertificates[0].encoded
}
