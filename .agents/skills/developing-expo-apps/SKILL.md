---
name: developing-expo-apps
description: "Replaces xcodebuild with remote XCode and Simulators and shows how to use them while building & testing Expo apps. Use when the user wants to build or run an iOS app, test iOS UI, see their app on a simulator, or says 'run it', 'build it', 'test it', 'show me a screenshot', or 'launch on simulator'."
user-invocable: true
effort: high
---

# Developing Expo apps with remote XCode & iOS Simulators

You are an iOS build-and-test operator. Your job is to get the user's iOS app running on a Limrun cloud simulator, verify it works, and iterate until the user is satisfied.

All builds and simulator operations run on Limrun and that's why you can build iOS
apps from any environments; linux, windows, macos, VM, container etc. Never try to
use local Xcode, local simulators, or local macOS build tools.

If `lim` CLI is not installed, you can install it with the following:

```bash
npm install --global @limrun/cli
```

Usage of `lim` CLI requires `LIM_API_KEY`. It must either be found in .env files or
available as environment variable.

## Debug Build (Dev Build)

The very first thing to check is to see if there is a debug build already built and stored in Asset Storage.
The convention to store debug builds in Asset Storage is naming them with bundle ID and branch, e.g. "com.acme.sample/main.zip"

Unless you made a change requiring a new Debug build, check if there is a build already stored that we can use:

```bash
lim assets list --name-prefix <bundle id>
```

If there is one, we should use it when creating the iOS simulator with `--install-asset` flag. For example:

```bash
# Add label selector depending on your identifiers. For example, Linear issue, repo name etc.
lim ios create \
  --reuse-if-exists \
  --install-asset com.anonymous.sample-expo55-app/main.zip \
  --label issue=<ISSUE ID> \
  --label repo=<Repo Name> \
  --label agent=<Your Agent Name>

# Example call: lim xcode create --reuse-if-exists --label issue=LIM-34 --label repo=sample-native-app --label agent=cursor
```

If there is none, or you want to get a new build and iterate on native modules, you can create an iOS Simulator
and XCode pair and trigger a build:

```bash
# Add label selector depending on your identifiers. For example, Linear issue, repo name etc.
lim ios create --xcode \
  --reuse-if-exists \
  --label issue=<ISSUE ID> \
  --label repo=<Repo Name> \
  --label agent=<Your Agent Name>
# Example call: lim xcode create --reuse-if-exists --label issue=LIM-34 --label repo=sample-native-app --label agent=cursor
```

Trigger a build which will automatically install it to the paired simulator:

```bash
lim xcode build . --configuration Debug
```

You can optionally add `--upload` flag so that it's uploaded to Asset Storage for future use.

```bash
lim xcode build . --configuration Debug --upload com.anonymous.sample-expo55-app/branch-a.zip
```

## Iteration

Debug builds require a Metro bundler URL to connect for hot module reload for changes to appear without rebuilds.

You can start the Metro bundler in your environment and open the Debug build in remote iOS Simulator with its deep-link to connect:

```bash
# This will start Metro bundler that Debug build in iOS simulator will connect to.
npx expo start --dev-client --tunnel
```

Now we can start our Debug build with a deep-link that will connect to our bundler:

```bash
lim ios open-url 'com.anonymous.sample-expo55-app://expo-development-client/?url=https%3A%2F%2Fsu2wjeo-anonymous-8081.exp.direct'
```

You can check whether it's opened or not with element tree or screenshot:
```bash
lim ios element-tree
```

```bash
lim ios screenshot screen.png
```

Once it's fully opened, you can make changes on the code and it will hot-reload.

If you make a change in native modules, you can always trigger a Debug build and continue iterating.

Use `--scheme` and `--workspace` flags if the project has multiple schemes or uses a workspace file. This makes sure the files are synced with the remote xcode and triggers
a build where the build logs are streamed through stdout and stderr.

Every successful build will automatically re-install the app in iOS Simulator and re-launch it.

## Interacting with the App

Prefer tapping by accessibility identifier, then by label, then by coordinates as a last resort:

```bash
lim ios tap-element --ax-unique-id startButton
lim ios tap-element --ax-label "Save"
lim ios tap 201 450
```

After every interaction, re-run `element-tree` to confirm the UI transitioned correctly. No sleep is needed between a tap and element-tree.

For text input:

```bash
lim ios type "hello world"
```

## Testing Changes

After every build, test new or changed functionality by using interaction commands. Focus on what changed plus a quick smoke test of core flows.

Use element tree for functional assertions (element existence, labels, state changes). Use screenshots only for visual-only properties.
Use video recording for most accurate interaction tests such as animations, gameplay,
real experience etc.

Generally, start with getting an element tree:

```bash
lim ios element-tree
```

Then if a single action will be taken, just call it. For example:

```bash
lim ios tap-element --ax-label Continue
```

If you will take multiple actions, you can create a chain of actions to be executed
with precise timing.

Some examples:

```bash
lim ios perform --action type=tap,x=100,y=200 --action "type=typeText,text=Hello World"

lim ios perform --action type=wait,durationMs=1000 --action type=pressKey,key=enter
```

You can write to a file and execute that too:

```bash
lim ios perform --file ./actions.yaml
```

Use `lim ios perform --help` for more details on how to use it.

Video recording is available so you can review what the user sees while you are taking actions. For
any testing involving motion prefer video over screenshots for review.

Always include a demo video in the pull request so that user can see how it works.

Start recording (non-blocking):

```bash
lim ios record start
```

Stop and save recording:

```bash
lim ios record stop -o /tmp/recording.mp4
```

Get logs of your app:

```bash
# Recent logs
lim ios app-log com.anonymous.sample-expo-test-app

# Last 50 lines
lim ios app-log com.anonymous.sample-expo-test-app --tail 50
```

Get syslog of the simulator for debugging deeper issues:

```bash
lim ios syslog
```

## Finalize

When you are done with the changes and present to the user, you should provide a
preview link to the user so they can test it but it needs to be a Release build so
that they don't need to have a Metro bundler running to open it.

If you will open a PR, make sure to do this and add the preview link to PR.

First build and make remote xcode upload the build:

```
ASSET_NAME="<bundle id/pr number/ or any session identifier>.zip"
lim xcode build . --configuration Release --upload ${ASSET_NAME}
```

And construct this link for preview:

```
# Change ${ASSET_NAME} with asset name given above
https://console.limrun.com/preview?asset=${ASSET_NAME}&platform=ios
```

Always provide this in your last message.

## Cleanup

When the user is satisfied or the conversation is ending, always clean up:

```bash
# This will delete xcode as well if it was paired.
lim ios delete
```

If you created a standalone xcode instance, then you need to delete that separately.
```bash
lim xcode delete
```

## Gotchas

These are common failure points. Check here first when something goes wrong.

- **Instance ID is optional.** The CLI remembers the last created instance. You only need to pass an ID explicitly when controlling multiple instances.
- **No sleep needed between `tap-element` and `element-tree`.** The tap blocks until complete.
- **`element-tree` can be large.** Pipe through `grep` or `jq` to extract what you need rather than dumping the full tree into context.
- **Build errors are your job to fix.** If a build fails, read the error output, fix the code, and rebuild. Do not ask the user to fix build errors.
- **Bundle ID discovery.** If you don't know the bundle ID, check the Xcode project files or run `lim ios list-apps` after a successful build.

## References

```bash
> lim ios
Execute any task on remote iOS Simulators: create, list, get, delete, info, list-apps, launch-app, terminate-app, app-log, syslog, sync, screenshot, tap, tap-element, element-tree, type, press-key, toggle-keyboard, scroll, open-url, install-app, record, perform, simctl, cp, xcrun, xcodebuild, lsof, reverse

USAGE
  $ lim ios COMMAND

COMMANDS
  ios app-log          Stream or tail app logs from a running iOS instance
  ios cp               Copy a local file into the iOS sandbox
  ios create           Create a new iOS instance
  ios delete           Delete an iOS instance
  ios element-tree     Get the UI element tree from a running iOS instance
  ios get              Get details for a specific iOS instance
  ios info             Get device information from a running iOS instance
  ios install-app      Install an app on a running iOS instance
  ios launch-app       Launch an app on a running iOS instance
  ios list             List iOS instances
  ios list-apps        List installed apps on a running iOS instance
  ios lsof             List open files on a running iOS instance
  ios open-url         Open a URL on a running iOS instance
  ios perform          Perform multiple iOS actions in a single batch
  ios press-key        Press a key on a running iOS instance
  ios record           Start or stop video recording on a running iOS instance
  ios reverse          Expose a local client-first service to the simulator
  ios screenshot       Capture a screenshot from a running iOS instance
  ios scroll           Scroll on a running iOS instance
  ios simctl           Run simctl on a running iOS instance
  ios sync             Sync a built app bundle to a running iOS instance
  ios syslog           Stream syslog from a running iOS instance
  ios tap              Tap at coordinates on a running iOS instance
  ios tap-element      Tap an iOS element by accessibility selector
  ios terminate-app    Terminate an app on a running iOS instance
  ios toggle-keyboard  Toggle the iOS software keyboard
  ios type             Type text into the focused iOS input field
  ios xcodebuild       Run xcodebuild on a running iOS instance
  ios xcrun            Run xcrun on a running iOS instance
```

```bash
> lim ios perform --help
Perform multiple iOS actions in a single batch

USAGE
  $ lim ios perform [--api-key <value>] [--json] [--quiet] [--create] [--id <value>] [--action <value>...] [-f <value>] [--timeout <value>]

FLAGS
  -f, --file=<value>
      Path to a YAML or JSON file containing an array of action objects.

      JSON example:
      [
      { "type": "tap", "x": 100, "y": 200 },
      { "type": "typeText", "text": "Hello World" }
      ]

      YAML example:
      - type: tap
      x: 100
      y: 200
      - type: typeText
      text: "Hello World"

  --action=<value>...
      Action definition as comma-separated key=value pairs; repeat for multiple actions.

      Available action types:
      - Tap on coordinate: type=tap,x=100,y=200
      - Tap on element by using a selector: type=tapElement,selector={"AXLabel":"Submit"}
      - Increment an element by using a selector: type=incrementElement,selector={"AXLabel":"Volume"}
      - Decrement an element by using a selector: type=decrementElement,selector={"AXLabel":"Volume"}
      - Set an element value by using a selector: type=setElementValue,text=42,selector={"AXLabel":"Counter"}
      - Type text into the focused field: type=typeText,text=Hello World,pressEnter=true
      - Press a key with optional modifiers: type=pressKey,key=a,modifiers=["shift"]
      - Scroll the screen: type=scroll,direction=down,pixels=300,coordinate=[200,400],momentum=0.2
      - Toggle the software keyboard: type=toggleKeyboard
      - Open a URL or deep link: type=openUrl,url=https://example.com
      - Set device orientation: type=setOrientation,orientation=Landscape
      - Wait before the next action: type=wait,durationMs=1000
      - Start a touch gesture: type=touchDown,x=100,y=200
      - Move a touch gesture: type=touchMove,x=120,y=220
      - End a touch gesture: type=touchUp,x=120,y=220
      - Press a raw key code down: type=keyDown,keyCode=4
      - Release a raw key code: type=keyUp,keyCode=4
      - Press a hardware button down: type=buttonDown,button=home
      - Release a hardware button: type=buttonUp,button=home

      Use JSON values for complex fields like selector, modifiers, and coordinate.

  --api-key=<value>
      [env: LIM_API_KEY] API key to use for this command. Overrides the saved login and can also be provided via LIM_API_KEY.

  --[no-]create
      Create a replacement instance automatically if the target instance is not found.

  --id=<value>
      iOS instance ID to target. Defaults to the last created iOS instance.

  --json
      Output structured JSON instead of human-readable tables or plain text when the command supports it.

  --quiet
      Suppress intermediate human-readable logs and only emit the final result.

  --timeout=<value>
      Override the total batch timeout in milliseconds. By default the CLI grows the timeout based on waits and action count.

DESCRIPTION
  Perform multiple iOS actions in a single batch

  Run a batch of iOS actions in a single CLI invocation using repeated `--action` flags or a JSON/YAML action file. This is the best choice for agent-driven
  multi-step interactions that should execute without reconnecting between steps.

EXAMPLES
  $ lim ios perform --action type=tap,x=100,y=200 --action "type=typeText,text=Hello World"

  $ lim ios perform --action type=wait,durationMs=1000 --action type=pressKey,key=enter

  $ lim ios perform --file ./actions.yaml
```

```bash
> lim xcode
Execute any task on remote XCode sandboxes: create, list, get, delete, sync, build, attach-simulator

USAGE
  $ lim xcode COMMAND

COMMANDS
  xcode attach-simulator  Attach an iOS simulator to an Xcode instance
  xcode build             Run xcodebuild on an Xcode sandbox
  xcode create            Create a new Xcode instance
  xcode delete            Delete an Xcode instance
  xcode get               Get details for a specific Xcode instance
  xcode list              List Xcode instances
  xcode sync              Continuously sync local source code to an Xcode
                          sandbox
```

```bash
> lim xcode build --help
Run xcodebuild on an Xcode sandbox

USAGE
  $ lim xcode build [PATH] [--api-key <value>] [--json] [--quiet] [--create] [--id <value>] [--scheme <value>] [--workspace <value>] [--project <value>]
    [--sdk iphonesimulator|iphoneos|watchsimulator|watchos] [--configuration Debug|Release] [--dev-server-url <value>] [--expo-app-dir <value>] [--upload
    <value>] [--signed-upload-url <value>] [--certificate-p12 <value>] [--certificate-password <value>] [--provisioning-profile <value>] [--basis-cache-dir
    <value>] [--max-patch-bytes <value>] [--ignore <value>...] [--additional-file <value>...]

ARGUMENTS
  [PATH]  Local project path to sync before building. Defaults to the current working directory.

FLAGS
  --additional-file=<value>...    Additional file to sync before building as localPath=remotePath, for example ~/.netrc=~/.netrc. Repeat for multiple files.
  --api-key=<value>               [env: LIM_API_KEY] API key to use for this command. Overrides the saved login and can also be provided via LIM_API_KEY.
  --basis-cache-dir=<value>       Directory to use for the client-side delta sync cache during the pre-build sync step.
  --certificate-p12=<value>       Path to a PKCS#12 (.p12) signing certificate. Requires --certificate-password and --provisioning-profile.
  --certificate-password=<value>  Password for the PKCS#12 signing certificate.
  --configuration=<option>        Xcode build configuration.
                                  <options: Debug|Release>
  --[no-]create                   Create a replacement instance automatically if the target instance is not found.
  --dev-server-url=<value>        Launch URL for Debug React Native / Expo builds. If the build is installed on an attached iOS simulator, the app opens this
                                  URL unchanged after build; otherwise this option has no launch effect. For Expo dev-client builds, pass the exact dev-client
                                  URL or development server URL you want opened.
  --expo-app-dir=<value>          Relative path from the synced workspace root to the Expo app directory. Use for monorepos or ambiguous React Native
                                  workspaces.
  --id=<value>                    Xcode instance ID to build on, or an iOS instance ID with `--xcode` enabled. Defaults to the most recently created
                                  Xcode-capable target.
  --ignore=<value>...             Regular expression to ignore matching relative paths during the pre-build sync. Repeat for multiple patterns.
  --json                          Output structured JSON instead of human-readable tables or plain text when the command supports it.
  --max-patch-bytes=<value>       Maximum patch size in bytes before falling back to a full upload during sync.
  --project=<value>               Project file to pass to xcodebuild, such as MyApp.xcodeproj
  --provisioning-profile=<value>  Path to a .mobileprovision profile. Requires --certificate-p12 and --certificate-password.
  --quiet                         Suppress intermediate human-readable logs and only emit the final result.
  --scheme=<value>                Xcode scheme to build, such as MyApp
  --sdk=<option>                  SDK family to build for.
                                  <options: iphonesimulator|iphoneos|watchsimulator|watchos>
  --signed-upload-url=<value>     Presigned URL to upload the resulting build artifact to.
  --upload=<value>                Upload the resulting build artifact as an asset with this name
  --workspace=<value>             Workspace file to pass to xcodebuild, such as MyApp.xcworkspace

DESCRIPTION
  Run xcodebuild on an Xcode sandbox

  Sync a local project path once (or the current working directory if omitted), then trigger a remote xcodebuild with streaming output. This works with
  standalone Xcode instances and can also target an iOS instance with `--xcode` enabled or created via `xcode create --ios` when you pass `--id`.

EXAMPLES
  $ lim xcode build

  $ lim xcode build ./MyProject

  $ lim xcode build --id <xcode-instance-ID>

  $ lim xcode build ./MyProject --id <xcode-instance-ID>

  $ lim xcode build --scheme MyApp --workspace MyApp.xcworkspace

  $ lim xcode build --configuration Debug

  $ lim xcode build ./ExpoApp --configuration Debug --dev-server-url https://abc123.exp.direct

  $ lim xcode build ./repo --expo-app-dir apps/mobile --configuration Debug --dev-server-url "myapp://expo-development-client/?url=http%3A%2F%2F10.244.7.112%3A57090"

  $ lim xcode build --scheme WatchApp --sdk watchsimulator

  $ lim xcode build ./MyProject --scheme MyApp --certificate-p12 ./certificate.p12 --certificate-password "$P12_PASSWORD" --provisioning-profile ./profile.mobileprovision --upload signed-device-build.ipa

  $ lim xcode build --id <ios-instance-ID> --project MyApp.xcodeproj --upload ios-build.zip

  $ lim xcode build --signed-upload-url <url>

  $ lim xcode build ./MyProject --basis-cache-dir ./.limsync-cache --max-patch-bytes 2097152

  $ lim xcode build ./MyProject --ignore "\\.xcuserdata/"

  $ lim xcode build ./MyProject --additional-file ~/.netrc=~/.netrc
```
