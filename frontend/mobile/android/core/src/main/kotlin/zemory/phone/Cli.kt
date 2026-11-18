package zemory.phone

import java.io.File

/**
 * Desktop runner for the phone client - the same code the app runs, against a real machine.
 *   core <pairing-code-file> <host:port | relay | relay://...> [send <repo> <body...>] [--hold <s>]
 * The pairing code is read from a FILE so it never sits in a shell history.
 */
fun main(args: Array<String>) {
    if (args.size < 2) {
        println("usage: <pairing-code-file> <host:port | relay | relay://...> [send <repo> <body...>] [--hold <s>]")
        return
    }
    val code = Regex("zph1\\.[A-Za-z0-9_-]+").find(File(args[0]).readText())?.value ?: error("no pairing code in ${args[0]}")
    val p = Pairing.parse(code) ?: error("bad pairing code")
    val hold = args.indexOf("--hold").let { if (it >= 0) args[it + 1].toLong() * 1000 else 8_000L }
    val send = if (args.getOrNull(2) == "send") listOf(Letter.to(p, args[3], args.drop(4).takeWhile { it != "--hold" }.joinToString(" "))) else emptyList()
    val id = Identity.loadOrCreate(File(System.getProperty("java.io.tmpdir"), "zemory-phone-cli"), "phone-${p.name}")
    // `get <path>...`: the app's live link - UI calls through req/res, as the WebView makes them
    if (args.getOrNull(2) == "get") {
        val t0 = System.currentTimeMillis()
        val link = Link.open(p, id, direct = args[1].takeIf { it != "relay" }, log = { println("  $it") })
        println("link open in ${System.currentTimeMillis() - t0} ms via ${link.via} · prefs held: ${link.prefs()?.take(60)}")
        for (path in args.drop(3).takeWhile { it != "--hold" }) {
            val t = System.currentTimeMillis()
            val r = link.request("GET", path)
            println("GET $path -> ${r.status} ${r.type} ${r.body.size} B in ${System.currentTimeMillis() - t} ms · ${r.text.take(160).replace("\n", " ")}")
        }
        link.close()
        return
    }
    val s = RemoteSession(p, id) { println("  $it") }
    send.forEach { println("sending ${it.id} -> ${p.host}/${it.toRepo}") }
    val target = args[1]
    val o = when {
        target == "relay" -> s.relay(null, send, hold)
        target.startsWith("relay://") -> s.relay(target, send, hold)
        else -> s.direct(target.substringBefore(":"), target.substringAfter(":").toInt(), send, hold)
    }
    println("via ${o.via} · connected in ${o.connectedMs} ms · acked ${o.acked.size}/${send.size} · received ${o.received.size}" + (o.error?.let { " · ERROR $it" } ?: ""))
    for (l in o.received) println("── ${l.fromHost}/${l.fromRepo} (${l.sentAt})${l.replyTo?.let { " reply to ${it.take(8)}" } ?: ""}\n${l.body}")
}
