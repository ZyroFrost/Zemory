package zemory.phone

import org.bouncycastle.asn1.x500.X500Name
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder
import java.io.File
import java.math.BigInteger
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.PrivateKey
import java.security.SecureRandom
import java.security.Security
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.security.spec.PKCS8EncodedKeySpec
import java.util.Date

/**
 * The phone's own channel identity: an Ed25519 key and a self-signed certificate, the same shape the daemon uses.
 * The machine never pins it (a phone is admitted by its pairing token); it exists because the channel's TLS requires a
 * client certificate.
 */
class Identity(val key: PrivateKey, val cert: X509Certificate) {
    val deviceId: String get() = DeviceId.fromDer(cert.encoded)

    companion object {
        init {
            Bc.install()
        }

        fun create(cn: String): Identity {
            val kp = KeyPairGenerator.getInstance("Ed25519", BouncyCastleProvider.PROVIDER_NAME).generateKeyPair()
            val name = X500Name("CN=$cn")
            val now = System.currentTimeMillis()
            val builder = JcaX509v3CertificateBuilder(
                name, BigInteger(128, SecureRandom()), Date(now - 86_400_000L), Date(now + 100L * 365 * 86_400_000L), name, kp.public,
            )
            val signer = JcaContentSignerBuilder("Ed25519").setProvider(BouncyCastleProvider.PROVIDER_NAME).build(kp.private)
            val cert = JcaX509CertificateConverter().setProvider(BouncyCastleProvider.PROVIDER_NAME).getCertificate(builder.build(signer))
            return Identity(kp.private, cert)
        }

        /** Load the identity kept in `dir`, or create and keep one. */
        fun loadOrCreate(dir: File, cn: String): Identity {
            val k = File(dir, "phone.key")
            val c = File(dir, "phone.crt")
            if (k.exists() && c.exists()) {
                try {
                    val key = KeyFactory.getInstance("Ed25519", BouncyCastleProvider.PROVIDER_NAME).generatePrivate(PKCS8EncodedKeySpec(k.readBytes()))
                    val cert = CertificateFactory.getInstance("X.509", BouncyCastleProvider.PROVIDER_NAME).generateCertificate(c.inputStream()) as X509Certificate
                    return Identity(key, cert)
                } catch (e: Exception) {
                    // unreadable: mint a new one (the machine does not pin phones, so nothing breaks)
                }
            }
            val id = create(cn)
            dir.mkdirs()
            k.writeBytes(id.key.encoded)
            c.writeBytes(id.cert.encoded)
            return id
        }
    }
}
