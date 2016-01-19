videojs-settings
============

A settings plugin for Hola Video.JS fork. Shows a menu with optional 3 items:

1. Technical info – shows overlay with video tech info
2. Quality select – if possible, user can select different quality for current video
3. Report playback issue – automatically send player logs to Hola (for now this feature is working only with Hola CDN)

Extra features:
- minimal right-click context menu;
- default volume/quality (if available) configuration;
- persistent volume/quality saved accross page reloads (if [hola/videojs-utils](https://github.com/hola/videojs-utils) included).

## Quick start

To start using Hola settings plugin, follow these steps:

1. Add these includes to your document's `<head>`:

  ```html
  <script src="https://cdn.rawgit.com/hola/videojs5-settings/bb54f577487475183edc58994c05518ba5f72459/dist/videojs-settings.min.js"></script>
  ```

2. Set `plugins` option for your Video.js setup:

  In video tag `data-setup` attribute in your html
  ```html
  data-setup='{"plugins":{"settings": {"info": true, "report": true, ...}}}'
  ```
  or in javascript videojs call:
  ```javascript
  videojs('your-video-element', {
    plugins: {
      settings: {
        info: true,
        report: true,
        quality: {
          sources: [
            {src:"http://cdn.example.com/static/mp4/example_1080p.mp4", type: "video/mp4", label: "high", onclick: function(){ login(); },
            {src:"http://cdn.example.com/static/mp4/example_720p.mp4", type: "video/mp4", label: "medium"},
            {src:"http://cdn.example.com/static/mp4/example_360p.mp4", type: "video/mp4", label: "low", "default": true}
          ]
        },
        volume: {level: 0.5, mute: true},
        show_settings_popup_on_click: true
      }
    }
  });
  ```

## Configuration options
The following configuration options are supported by this plugin:

| Property                      | Type                 | Default  | Description |
| ----------------------------- | -------------------- | ---------| ----------- |
| info                          | ```<Boolean>```      | false    | Show 'technical info' in settings menu |
| report                        | ```<Boolean>```      | false    | Show 'report playback issue' in settings menu |
| quality.sources               | ```<Array>```        |          | List of quality sources. Shown in settings menu if ```quality.sources.length>1``` |
| quality.sources[i].src        | ```<String>```       |          | Media source URL |
| quality.sources[i].type       | ```<String>```       |          | Media source type |
| quality.sources[i].label      | ```<String>```       |          | Media source label: shown in settings menu |
| quality.sources[i]['default'] | ```<Boolean>```      | false    | Media source to be selected by default. NOTE: this may be overriden by persistent configuration.|
| quality.sources[i].onclick    | ```<Function>```     |          | Add an onclick hook called when user selects this quality. Returning non-true value will ignore user request. Important when, for instance, HD quality is available for logged-in users only. |
| volume                        | ```<Object>|false``` |          | Default volume configuration. Use `false` to disable default volume control including saved persistent configuration. |
| volume.level                  | ```<Float>```        | 1.0      | Volume level between 0.0 and 1.0. NOTE: use volume.mute instead of 0.0 if you want to disable volume level |
| volume.mute                   | ```<Boolean>```      | false    | Volume mute |
| show_settings_popup_on_click  | ```<Boolean>```      | false    | Select the trigger method to show settings menu: onhover (false) or onclick (true) |
