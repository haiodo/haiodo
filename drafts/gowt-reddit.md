# r/golang post - draft

Repo: github.com/haiodo/gowt (EPL-2.0). Blog write-up: https://haiodo.github.io/en/posts/023_gowt

---

## Title

gowt: native GUI for Go - Eclipse SWT translated to Go, running on AppKit, Win32 and GTK 3.

## Body

Hi r/golang. I'm working with different languages for more of two decades, started with Java, continued with Go, switched to Node and JS stack. Most of my professional activity was targeted for tools and frameworks for engineers and developers. But in most cases I prefer an native applications, since whey uses lower memory, native l&f of OS more suitable for general use.

A few months ago I was looking for a good framework to build an UI on go for all platforms, and was not able to find it, so I decided to build one. But since work could be a really complicated and since I've worked in different language worlds, I've decided to do a port of SWT :-).

I'm looking for adopters, who could help with linux/windows testing and could help to cleanup it into a powerful and modern UI framework for anyone to use.

**The short version.** I wanted native OS controls and `GOOS=windows go build` from my Mac, with no C toolchain in the default build. SWT had the controls; it was Java. So I translated it to Go.

SWT is the toolkit under Eclipse. It is native on exactly the three systems I care about, it is EPL-2.0, and it has two decades of bug fixing behind the widgets.

A translator (`tooling/j2go`, built on Eclipse JDT) turns the Java into Go; the generated code is committed, so users need neither Java nor the SWT sources.

What that buys:

* real AppKit, Win32 and GTK 3 controls - an `NSTextField`, an `EDIT`, a `GtkEntry`;
* `CGO_ENABLED=0` by default: `purego` on macOS and Linux, `syscall.SyscallN` on Windows, the OS libraries load at run time;
* cross-compiling the examples to darwin, windows and linux from one Mac;
* a small facade (`gowt`) over the SWT API, with the full SWT surface in package `swt` for porting existing Java code;
* cgo is supported too, as a speed mode: `CGO_ENABLED=1 -tags gowtcgo` gives direct calls on all three systems (about 8x on macOS and the cairo path on Linux); the default build needs no C toolchain;
* Go 1.27+, macOS 13+, Windows 10+ or Linux with GTK 3. License EPL-2.0.

Hello:

    package main
    
    import (
    	"log"
    
    	"github.com/haiodo/gowt"
    )
    
    func main() {
    	err := gowt.Run(func(app *gowt.App) {
    		w := app.Window("Hello",
    			gowt.Label("Hello, gowt"),
    			gowt.Button("Quit", gowt.OnClick(app.Quit)))
    		w.Show()
    	})
    	if err != nil {
    		log.Fatal(err)
    	}
    }

The facade is Go-shaped: constructors return descriptions that become widgets when passed to their parent, everything about a widget is an option, callbacks are plain functions, and a small `rx` package holds state that widgets bind to.

**Screenshots.** Eight demo apps (chat, dashboard, editor, files, mail, settings, tracker, monitor) on macOS, Windows 11 and Linux GNOME, same size on every OS:

[https://github.com/haiodo/gowt/blob/main/docs/apps.md](https://github.com/haiodo/gowt/blob/main/docs/apps.md)

**Web view and drawing.** `webview` embeds the system engine (WKWebView, WebView2, WebKitGTK 4.1), so no browser ships with the app, and pages can come from an `embed.FS` with no local server. Custom drawing is `Canvas` for immediate painting or the experimental `gfx` retained scene: 10k boxes and 20k connectors draw a first frame in about 30 ms on an M4 Max, pan at 0.1 ms of frame CPU, and take 32-56 ms for the first frame on GPU-less VMs. The controls themselves are drawn by the OS, so a big table costs what the native table costs.

**The tests are the reason I trust it.** A 450k-line translation can't be checked by clicking around, so I translated SWT's JUnit suite too. `make test-swt` compares each run against a per-stand expected file, and a new failure fails the gate. 3,894 tests on macOS and Windows, 3,901 on Linux:

|Stand|pass|fail|skip|
|:-|:-|:-|:-|
|macOS, real Mac|3818|4(skipped)|69|
|Windows 11 arm64, VM|3799|0|89|
|Linux, Ubuntu 26.04 GNOME/Wayland, VM|3836|4(skipped)|60|

For apps there is a QA driver: build with `-tags gowtqa` and a normal `go test` finds controls, clicks, types, waits for the app to settle and reads the screen.

**What is missing** (docs/platforms.md has the full list):

* Windows dark content is opt-in, Mica/Acrylic not verified by eye, per-monitor DPI changes untested;
* GTK 3 only, GTK 4 is a study;
* fewer widgets than a mature toolkit, and the demo apps are UI demos with static data.

**Why I'm posting.** Two questions: does "native widgets + no cgo + cross-compile" matter to anyone but me, and which gap would stop you first? If you have a Windows or Linux box, `go run ./cmd/fieldcheck` runs the suites locally and produces a zip - that is the most useful contribution right now.

Longer write-up with the architecture, the test stands and the measured rendering numbers: [https://haiodo.github.io/en/posts/021\_widget\_toolkit](https://haiodo.github.io/en/posts/021_widget_toolkit)

Repo: [https://github.com/haiodo/gowt](https://github.com/haiodo/gowt) \- docs start at [https://github.com/haiodo/gowt/blob/main/docs/README.md](https://github.com/haiodo/gowt/blob/main/docs/README.md)