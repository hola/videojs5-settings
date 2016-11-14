(function(window, vjs){
'use strict';
// XXX michaelg remove when vjs5.1 exposes this interface
var vjs_merge = function(obj1, obj2){
    if (!obj2) { return obj1; }
    for (var key in obj2){
        if (Object.prototype.hasOwnProperty.call(obj2, key)) {
            obj1[key] = obj2[key];
        }
    }
    return obj1;
};
var settings_icon_svg = '<svg height="100%" width="100%" viewBox="0 0 16 16">'
        +'<path class="st0" d="M16,9.4V6.6h-2.2c-0.2-0.6-0.4-1.3-0.8-1.8l1.5-1.5l-1.9-1.9l-1.5,1.5C10.6,2.6,10,2.3,9.4,2.2V0H6.6v2.2'
        +'C6,2.3,5.4,2.6,4.8,2.9L3.3,1.4L1.4,3.3l1.5,1.5C2.6,5.4,2.3,6,2.2,6.6H0v2.7h2.2c0.2,0.6,0.4,1.3,0.8,1.8l-1.5,1.5l1.9,1.9l1.5-1.5'
        +'c0.5,0.3,1.2,0.6,1.8,0.8V16h2.7v-2.2c0.6-0.2,1.3-0.4,1.8-0.8l1.5,1.5l1.9-1.9l-1.5-1.5c0.3-0.5,0.6-1.2,0.8-1.8H16z M8,11'
        +'c-1.7,0-3-1.3-3-3s1.3-3,3-3s3,1.3,3,3S9.7,11,8,11z"/>'
    +'</svg>';
var info_overlay, notify_overlay;
var Menu = vjs.getComponent('Menu');
vjs.registerComponent('PopupMenu', vjs.extend(Menu, {
    className: 'vjs-rightclick-popup',
    popped: false,
    constructor: function(player, options){
        Menu.call(this, player, options);
        var player_ = player;
        this.addClass(this.className);
        this.hide();
        var _this = this;
        var opt = this.options_;
        var offset = opt.offset||5;
        this.addChild(new LogButton(player, {label: 'Download log'}));
        this.addChild(new CopyLogButton(player, {label: 'Copy debug info'}));
        if (opt.report)
        {
            opt.report = vjs.mergeOptions({label: 'Report playback issue'},
                opt.report);
            this.addChild(new ReportButton(player, opt.report));
        }
        if (opt.info)
        {
            opt.info = vjs.mergeOptions({label: 'Stats for nerds'}, opt.info);
            this.addChild(new InfoButton(player, opt.info));
        }
        if (opt.graph)
        {
            opt.graph = vjs.mergeOptions({label: 'CDN overlay'}, opt.graph);
            this.addChild(new GraphButton(player, opt.graph));
        }
        this.addChild(new MenuItemLink(player, {
            href: 'https://holacdn.com/player',
            label: 'About Hola VideoJS player',
        }));
        player_.on('contextmenu', function(evt){
            evt.preventDefault();
            if (_this.popped)
            {
                _this.hide();
                _this.popped = false;
            }
            else
            {
                _this.show();
                var oX = evt.offsetX;
                var oY = evt.offsetY;
                var left_shift =
                    _this.el_.offsetWidth+oX+offset-player_.el_.offsetWidth;
                left_shift = Math.max(0, left_shift);
                var top_shift =
                    _this.el_.offsetHeight+oY+offset-player_.el_.offsetHeight;
                top_shift = Math.max(0, top_shift);
                oX = oX-left_shift;
                oY = oY-top_shift;
                _this.el_.style.top=oY+'px';
                _this.el_.style.left=oX+'px';
                _this.popped = true;
            }
        });
        player_.on('click', function(evt){
            if (_this.popped)
            {
                _this.hide();
                _this.popped = false;
                evt.stopPropagation();
                evt.preventDefault();
                return false;
            }
        });
        this.children().forEach(function(item){
            item.on('click', function(evt){
                _this.hide();
                _this.popped = false;
            });
        });
    }
}));
var MenuButton = vjs.getComponent('MenuButton');
vjs.registerComponent('SettingsButton', vjs.extend(MenuButton, {
    controlText_: 'Settings',
    createEl: function(){
        var settings_button = MenuButton.prototype.createEl.call(this);
        var icon = this.icon_ = document.createElement('div');
        icon.setAttribute('class', 'vjs-button-icon');
        icon.innerHTML = settings_icon_svg;
        settings_button.insertBefore(icon, settings_button.firstChild);
        return settings_button;
    },
    buildCSSClass: function(){
        var className = MenuButton.prototype.buildCSSClass.call(this);
        return className+' vjs-settings-button';
    },
    createItems: function(){
        var items = [];
        var player = this.player_;
        var quality = this.options_.quality;
        var sources = quality && quality.sources ? quality.sources :
            player.options_.sources;
        if (!sources || !sources.length)
            return [];
        var label;
        for (var i=0; i<sources.length; i+=1)
        {
            label = sources[i].label || (sources.length==1 ?
                'Auto' : ('Source '+(i+1)));
            items.push(new QualityButton(player, vjs_merge(sources[i], {
                label: label})));
        }
        return items;
    },
    createMenu: function(){
        var _this = this;
        var opt = this.options_;
        var menu = MenuButton.prototype.createMenu.call(this);
        menu.addClass('vjs-menu-popup-on-click');
        // videojs removes the locking state on menu item click that causes
        // settings button to hide without updating buttonPressed state
        menu.children().forEach(function(component){
            component.on('click', function(){ _this.handleClick(); });
        });
        return menu;
    },
    handleClick: function(){
        var expanded_classname = 'vjs-settings-expanded';
        if (this.buttonPressed_)
        {
            this.player_.removeClass(expanded_classname);
            this.unpressButton();
        }
        else
        {
            this.player_.addClass(expanded_classname);
            this.pressButton();
        }
    },
    tooltipHandler: function(){
        return this.icon_;
    },
    updateQuality: function(data){
        var sources = [];
        var callback = data.callback;
        var current = data.quality.current;
        var selected = data.quality.selected;
        data.quality.list.forEach(function(item){
            var item_selected = selected==-1 ? item.id==-1 : item.id==current;
            sources.push({level_id: item.id, label: item.label,
                callback: callback, selected: item_selected});
        });
        this.options_.quality = this.options_.quality||{};
        this.options_.quality.sources = sources;
        this.update();
    }
}));
var Component = vjs.getComponent('Component');
vjs.registerComponent('Overlay', vjs.extend(Component, {
    createEl: function(type, props){
        var custom_class = this.options_['class'];
        custom_class = custom_class ? ' '+custom_class : '';
        var proto_component = Component.prototype;
        var container = proto_component.createEl.call(this, 'div', vjs_merge({
            className: 'vjs-info-overlay'+custom_class,
        }, props));
        this.createContent(container);
        return container;
    },
    createContent: function(container){},
}));
function round(val){
    if (typeof val!='number')
        return val;
    return val.toFixed(3);
}
var Overlay = vjs.getComponent('Overlay');
vjs.registerComponent('InfoOverlay', vjs.extend(Overlay, {
    info_data: {
        duration: {
            units: 'sec',
            title: 'Duration',
            get: function(p){ return round(p.duration()); },
        },
        position: {
            units: 'sec',
            title: 'Position',
            get: function(p){
                return round(p.currentTime());
            },
        },
        buffered: {
            units: 'sec',
            title: 'Current buffer',
            get: function(p){
                var range = p.buffered();
                var pos = p.currentTime();
                if (range && range.length)
                {
                    for (var i=0; i<range.length; i+=1)
                    {
                        if (range.start(i)<=pos && range.end(i)>=pos)
                            return round(range.end(i)-pos);
                    }
                }
                return '--';
            },
        },
        downloaded: {
            units: 'sec',
            title: 'Downloaded',
            get: function(p){
                var range = p.buffered();
                var buf_sec = 0;
                if (range && range.length)
                {
                    for (var i=0; i<range.length; i+=1)
                        buf_sec += range.end(i)-range.start(i);
                }
                return round(buf_sec);
            },
        },
    },
    createContent: function(container){
        var _this = this;
        var player = this.player_;
        function create_el(el, opt){
            opt = opt ? vjs_merge(opt) : opt;
            var proto_component = Component.prototype;
            return proto_component.createEl.call(_this, el, opt);
        }
        var title = create_el('div', {
            className: 'vjs-info-overlay-title',
            innerHTML: 'Technical info',
        });
        var close_btn = create_el('div', {
            className: 'vjs-info-overlay-x',
            innerHTML: '\u274c',
        });
        close_btn.addEventListener('click', function(evt){
            if (!info_overlay)
                return;
            info_overlay.toggle();
        });
        var content = create_el('div', {
            className: 'vjs-info-overlay-content'});
        var list = create_el('ul', {className: 'vjs-info-overlay-list'});
        var item;
        var title_text;
        for (var i in this.info_data)
        {
            item = create_el('li', {className: 'vjs-info-overlay-list-item'});
            title_text = this.info_data[i].title;
            if (this.info_data[i].units)
                title_text += ' ['+this.info_data[i].units+']';
            title_text += ': ';
            item.appendChild(create_el('strong', {
                innerHTML: title_text}));
            this.info_data[i].el = create_el('span');
            item.appendChild(this.info_data[i].el);
            list.appendChild(item);
        }
        content.appendChild(list);
        container.appendChild(title);
        container.appendChild(close_btn);
        container.appendChild(content);
        this.update();
        player.on('timeupdate', function(){ _this.update(); });
        // force updates when player is paused
        setInterval(function(){ _this.update(); }, 1000);
    },
    update: function(){
        var player = this.player_;
        var info = this.info_data;
        for (var i in info)
            info[i].el.innerHTML = info[i].get(player);
    },
    toggle: function(caller){
        if (caller)
            this.last_caller = caller;
        if (this.visible)
        {
            this.visible = false;
            if (this.last_caller)
                this.last_caller.selected(false);
            this.addClass('vjs-hidden');
            return;
        }
        this.update();
        this.visible = true;
        this.removeClass('vjs-hidden');
    },
}));
vjs.registerComponent('NotifyOverlay', vjs.extend(Overlay, {
    createContent: function(container){
        var _this = this;
        function create_el(el, opt){
            opt = opt ? vjs_merge(opt) : opt;
            var proto_component = Component.prototype;
            return proto_component.createEl.call(_this, el, opt);
        }
        var title = create_el('div', {
            className: 'vjs-notify-overlay-title',
            innerHTML: 'Issue report sent.',
        });
        var content = create_el('div', {
            className: 'vjs-notify-overlay-content',
            innerHTML: 'Thank you!',
        });
        container.appendChild(title);
        container.appendChild(content);
    },
    flash: function(){
        if (this.visible)
            return;
        this.visible = true;
        this.removeClass('vjs-hidden');
        var _this = this;
        setTimeout(function(){
            _this.addClass('vjs-notify-flash');
        }, 50);
        setTimeout(function(){
            _this.visible = false;
            _this.removeClass('vjs-notify-flash');
            _this.addClass('vjs-hidden');
        }, 3500);
    },
}));
var MenuItem = vjs.getComponent('MenuItem');
vjs.registerComponent('MenuItemLink', vjs.extend(MenuItem, {
    createEl: function(type, props){
        var prot = MenuItem.prototype;
        var label = this.localize(this.options_['label']);
        var el = prot.createEl.call(this, 'li', vjs_merge({
            className: 'vjs-menu-item vjs-menu-item-link',
            innerHTML: '',
        }, props));
        this.link = Component.prototype.createEl('a', {
            className: 'vjs-menu-link',
            innerHTML: label,
        }, {
            target: '_blank',
            href: this.options_.href||'#',
        });
        el.appendChild(this.link);
        return el;
    },
    handleClick: function(e){ e.stopPropagation(); },
}));
var MenuItemLink = vjs.getComponent('MenuItemLink');
vjs.registerComponent('ReportButton', vjs.extend(MenuItem, {
    constructor: function(player, options){
        MenuItem.call(this, player, options);
        var player_ = player;
        this.on('click', function(){
            // XXX alexeym: make it work without cdn
            player_.trigger({type: 'problem_report'});
            notify_overlay.flash();
            this.selected(false);
        });
    }
}));
var ReportButton = vjs.getComponent('ReportButton');
vjs.registerComponent('LogButton', vjs.extend(MenuItem, {
    constructor: function(player, options){
        MenuItem.call(this, player, options);
        var player_ = player;
        this.on('click', function(){
            // XXX alexeym: make it work without cdn
            player_.trigger({type: 'save_logs'});
            this.selected(false);
        });
    }
}));
var LogButton = vjs.getComponent('LogButton');
vjs.registerComponent('GraphButton', vjs.extend(MenuItem, {
    constructor: function(player, options){
        MenuItem.call(this, player, options);
        var player_ = player;
        this.on('click', function(){
            // XXX michaelg: won't work without cdn
            player_.trigger({type: 'cdn_graph_overlay'});
            this.selected(false);
        });
    }
}));
var GraphButton = vjs.getComponent('GraphButton');
var Clipboard = window.Clipboard;
vjs.registerComponent('CopyLogButton', vjs.extend(MenuItem, {
    constructor: function(player, options){
        MenuItem.call(this, player, options);
        var player_ = player;
        this.clipboard = new Clipboard(this.el_, {
            text: function(){
                if (!player_.hola_logs)
                    return 'Can\'t find hola_logs method!';
                return player_.hola_logs();
            },
        });
    },
    dispose: function(){
        this.clipboard.destroy();
        MenuItem.prototype.dispose.call(this);
    },
}));
var CopyLogButton = vjs.getComponent('CopyLogButton');
vjs.registerComponent('InfoButton', vjs.extend(MenuItem, {
    constructor: function(player, options){
        MenuItem.call(this, player, options);
        this.on('click', function(){
            // XXX alexeym/michaelg: use vjs api to get overlay object
            if (!info_overlay)
                return;
            info_overlay.toggle(this);
        });
    }
}));
var InfoButton = vjs.getComponent('InfoButton');
vjs.registerComponent('MenuLabel', vjs.extend(Component, {
    createEl: function(type, props){
        var prot = Component.prototype;
        return prot.createEl.call(this, 'li', vjs_merge({
            className: 'vjs-menu-item vjs-menu-label',
            innerHTML: this.options_.label,
        }, props));
    },
}));
var MenuLabel = vjs.getComponent('MenuLabel');
vjs.registerComponent('QualityButton', vjs.extend(MenuItem, {
    constructor: function(player, options){
        options = vjs_merge({selectable: true}, options);
        MenuItem.call(this, player, options);
        this.player_.one('play', vjs.bind(this, this.update));
        this.player_.on('resolutionchange', vjs.bind(this, this.update));
        if (options['default'])
            this.player_.src(options.src);
        this.update();
    },
    is_current_src: function(){
        var player = this.player_;
        var current_src = player.cache_.src;
        var hola = window.hola_cdn;
        var hola_player = hola && hola.get_player ? hola.get_player() : null;
        // in case of hola_cdn attached get origin video url insteab of blob
        if (hola_player && hola_player.vjs===player)
            current_src = hola_player.get_url();
        return this.options_.src==current_src;
    },
    handleClick: function(){
        var player = this.player_;
        var quality = this.options_;
        // XXX volodymyr: implemented for html5 only, flash requires extra
        // additions, check https://github.com/vidcaster/video-js-resolutions
        if (player.techName_!=='Html5')
            return;
        var event = new window.CustomEvent('beforeresolutionchange');
        player.trigger(event, quality);
        if (event.defaultPrevented)
            return;
        var level_id = this.options_.level_id;
        if (!this.options_.src && level_id!==undefined)
        {
            if (this.options_.callback)
                this.options_.callback(level_id);
            player.trigger('resolutionchange');
            return this;
        }
        if (this.is_current_src())
        {
            player.trigger('resolutionchange');
            return this; // basically a no-op
        }
        var current_time = player.currentTime();
        var remain_paused = player.paused();
        player.pause();
        player.src(quality.src);
        player.ready(function(){
            player.one('loadeddata', vjs.bind(this, function(){
                this.currentTime(current_time);
            }));
            player.trigger('resolutionchange');
            if (!remain_paused)
            {
                player.load();
                player.play();
            }
        });
    },
    update: function(){
        if (this.options_.src)
            this.selected(this.is_current_src());
        else
            this.selected(this.options_.selected);
    },
}));
var QualityButton = vjs.getComponent('QualityButton');

vjs.plugin('settings', function(opt){
    var video = this;
    if (opt===undefined||opt===true)
        opt = {info: true, report: true, quality: false};
    opt = vjs.mergeOptions({}, opt);
    video.ready(function(){
        function local_storage_set(key, value){
            try { vjs.utils.localStorage.setItem(key, value); } catch(e){}
        }
        function local_storage_get(key){
            try { return vjs.utils.localStorage.getItem(key); }
            catch(e){ return null; }
        }
        function sources_normalize(sources, label_sav){
            var i, source_def, source_sav;
            sources = sources.filter(function(e){ return e.src; });
            for (i=0; i<sources.length; i+=1)
            {
                if (!sources[i].label)
                    sources[i].label = sources[i].type;
                if (!source_def && sources[i]['default']!==undefined)
                    source_def = sources[i];
                if (label_sav && label_sav==sources[i].label &&
                    sources[i]['prevent-default']===undefined)
                {
                    source_sav = sources[i];
                }
            }
            for (i=0; i<sources.length; i+=1)
            {
                sources[i]['default'] =
                    source_sav ? sources[i]===source_sav :
                    source_def ? sources[i]===source_def : !i;
            }
            return sources;
        }
        function add_settings_button(){
            return video.controlBar.addChild('SettingsButton',
                vjs.mergeOptions({}, opt));
        }
        var is_hls_provider = video.tech_.hlsProvider;
        if (opt.quality && !is_hls_provider)
        {
            var quality_key = 'vjs5_quality';
            if (opt.quality===true)
                opt.quality = {sources: video.options_.sources};
            opt.quality.sources = sources_normalize(opt.quality.sources,
                local_storage_get(quality_key));
            video.on('resolutionchange', function(){
                var sources = opt.quality.sources;
                for (var i=0; i<sources.length; i++)
                {
                    if (video.currentSrc()!=sources[i].src)
                        continue;
                    local_storage_set(quality_key, sources[i].label);
                    break;
                }
            });
        }
        var settings_button;
        if (opt.quality && opt.quality.sources && opt.quality.sources.length)
            settings_button = add_settings_button();
        if (opt.quality && is_hls_provider)
        {
            video.tech_.on('loadedqualitydata', function(e, data){
                if (!settings_button)
                    settings_button = add_settings_button();
                settings_button.updateQuality(data);
            });
        }
        if (opt.info)
        {
            info_overlay = video.addChild('InfoOverlay', {});
            info_overlay.addClass('vjs-hidden');
        }
        if (opt.report)
        {
            notify_overlay = video.addChild('NotifyOverlay',
                {'class': 'vjs-notify-overlay'});
            notify_overlay.addClass('vjs-hidden');
        }
        if (opt.volume || opt.volume===undefined)
        {
            var volume_key = 'vjs5_volume', mute_key = 'vjs5_mute';
            var volume = vjs.mergeOptions({level: 1, mute: false}, opt.volume);
            // quality configuration above might have reset the source
            // thus make sure video is ready before changing the volume
            video.ready(function(){
                if (!volume.override_local_storage)
                {
                    var ls_level, ls_mute;
                    if ((ls_level = local_storage_get(volume_key))!=null)
                        volume.level = ls_level;
                    if ((ls_mute = local_storage_get(mute_key))!=null)
                        volume.mute = ls_mute=='true';
                }
                video.volume(volume.level);
                video.muted(volume.mute);
            });
            video.on('volumechange', function(){
                local_storage_set(volume_key, video.volume());
                local_storage_set(mute_key, video.muted());
            });
        }
        video.addChild('PopupMenu', vjs.mergeOptions({}, opt));
    });
});

}(window, window.videojs));
