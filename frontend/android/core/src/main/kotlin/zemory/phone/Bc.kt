package zemory.phone

import org.bouncycastle.jce.provider.BouncyCastleProvider
import java.security.Security

/**
 * Install the FULL BouncyCastle provider. Android ships a cut-down provider under the same name "BC" without Ed25519, so
 * "add it if missing" would keep the cut-down one and every Ed25519 call would fail on the phone only.
 */
object Bc {
    @Volatile private var done = false

    fun install() {
        if (done) return
        synchronized(this) {
            if (done) return
            val cur = Security.getProvider(BouncyCastleProvider.PROVIDER_NAME)
            if (cur !is BouncyCastleProvider || cur.getService("KeyPairGenerator", "Ed25519") == null) {
                Security.removeProvider(BouncyCastleProvider.PROVIDER_NAME)
                Security.insertProviderAt(BouncyCastleProvider(), 1)
            }
            done = true
        }
    }
}
