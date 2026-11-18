package zemory.phone

import java.util.Base64
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Vectors computed by the daemon's own code (dist/memory/channel/identity.js · globaldisco.js) - the two must agree byte for byte. */
class CoreTest {
    private val pc = "SGEKJ2R3-A6KS7XNZ-753MRCJV-LLMQJSAE-YMRM4CI7-PEUB6466-7BFZFPPV-CLAI"

    @Test fun `device id matches the daemon`() {
        assertEquals("WFQSXQOF-MXFD274F-RCBQKJMB-Y6RF2A7X-2KFC75KF-T4VGB3YD-TLMH5MWS-VYA2", DeviceId.fromDer("zemory-test-vector".toByteArray()))
        assertEquals("9188a4ea20f2a5fbb7fddb2224ad6c82640c322ce090f2503ee7be12e4af7896", DeviceId.bytes(pc)!!.joinToString("") { "%02x".format(it) })
        assertEquals("SGEKJ2R-A6KS7XB-N753MRC-JLLMQJG-SAYMRM4-CIPEUBB-6467BFZ-FPPCLAZ", DeviceId.toSyncthing(pc))
        assertTrue(DeviceId.same(pc, pc.lowercase().replace("-", "")))
        assertNull(DeviceId.bytes("SGEKJ2R4-A6KS7XNZ"), "a wrong check digit is refused")
    }

    @Test fun `pairing code round trip`() {
        val json = """{"v":1,"name":"pixel","host":"LAPTOP-1","fp":"$pc","token":"abc"}"""
        val p = Pairing.parse("zph1." + Base64.getUrlEncoder().withoutPadding().encodeToString(json.toByteArray()))
        assertNotNull(p)
        assertEquals("phone-pixel", p.phoneHost)
        assertNull(Pairing.parse("zph1.!!"))
        assertNull(Pairing.parse("zph1." + Base64.getUrlEncoder().encodeToString("""{"v":2}""".toByteArray())))
    }

    @Test fun `proof matches the daemon's HMAC`() {
        // node: createHmac("sha256","k").update("a|b").digest("base64")
        assertEquals("4V0D6AqHOK4agzTEQZ6J6oZeg5Og+2oDNk9ivecFxKY=", Wire.proof("k", "a", "b"))
    }

    @Test fun `identity is Ed25519 and its id reads back`() {
        val id = Identity.create("phone-test")
        assertEquals("Ed25519", id.cert.publicKey.algorithm)
        assertEquals(id.deviceId, DeviceId.fromDer(id.cert.encoded))
        assertNotNull(DeviceId.bytes(id.deviceId))
    }
}
