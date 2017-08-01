(function(window, vjs){
'use strict';
require('@hola.org/videojs-utils');
var Clipboard = require('clipboard');
var find = require('lodash/find');
var settings_icon_svg = '<svg height="100%" width="100%" viewBox="0 0 16 16">'
        +'<path class="st0" d="M16,9.4V6.6h-2.2c-0.2-0.6-0.4-1.3-0.8-1.8l1.5-1.5l-1.9-1.9l-1.5,1.5C10.6,2.6,10,2.3,9.4,2.2V0H6.6v2.2'
        +'C6,2.3,5.4,2.6,4.8,2.9L3.3,1.4L1.4,3.3l1.5,1.5C2.6,5.4,2.3,6,2.2,6.6H0v2.7h2.2c0.2,0.6,0.4,1.3,0.8,1.8l-1.5,1.5l1.9,1.9l1.5-1.5'
        +'c0.5,0.3,1.2,0.6,1.8,0.8V16h2.7v-2.2c0.6-0.2,1.3-0.4,1.8-0.8l1.5,1.5l1.9-1.9l-1.5-1.5c0.3-0.5,0.6-1.2,0.8-1.8H16z M8,11'
        +'c-1.7,0-3-1.3-3-3s1.3-3,3-3s3,1.3,3,3S9.7,11,8,11z"/>'
    +'</svg>';
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
        _this.menuEnabled = true;
        if (opt.debugging)
        {
            this.addChild(new LogButton(player, {label: 'Download log'}));
            this.addChild(
                new CopyLogButton(player, {label: 'Copy debug info'}));
        }
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
        if (opt.about)
        {
            this.addChild(new MenuItemLink(player, {
                href: 'https://holacdn.com/player',
                label: 'About Hola Player',
            }));
        }
        function oncontextmenu(evt){
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
                _this.check_items();
            }
        }
        player_.on('contextmenu', oncontextmenu);
        player_.on(['tap', 'click'], function(evt){
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
            item.on(['tap', 'click'], function(){
                _this.hide();
                _this.popped = false;
            });
        });
        player.enablePopupMenu = function(){
            if (!_this.menuEnabled)
            {
                player_.off('contextmenu');
                player_.on('contextmenu', oncontextmenu);
                _this.menuEnabled = true;
            }
        };
        player.disablePopupMenu = function(){
            if (_this.menuEnabled)
            {
                player_.off('contextmenu');
                player_.on('contextmenu', function(evt){
                    evt.preventDefault(); });
                _this.menuEnabled = false;
            }
        };
    },
    check_items: function(){
        this.children().forEach(function(item){
            if (item.is_visible)
                item.toggleClass('vjs-hidden', !item.is_visible());
        });
    },
}));
var MenuButton = vjs.getComponent('MenuButton');
vjs.registerComponent('SettingsButton', vjs.extend(MenuButton, {
    controlText_: 'Settings',
    constructor: function(player, options){
        MenuButton.call(this, player, options);
        player.one('play', vjs.bind(this, this.updateSelected));
        player.on('resolutionchange', vjs.bind(this, this.updateSelected));
        this.updateSelected();
    },
    update: function(){
        var player = this.player_;
        var menu = this.createMenu();
        if (this.menu)
            player.removeChild(this.menu);
        this.menu = menu;
        player.addChild(menu);
        this.buttonPressed_ = false;
        this.el_.setAttribute('aria-expanded', 'false');
        if (this.items && !this.items.length)
            this.hide();
        else if (this.items && this.items.length>1)
            this.show();
    },
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
            items.push(new QualityButton(player, vjs.mergeOptions(sources[i],
                {label: label, callback: quality.callback})));
        }
        return items;
    },
    createMenu: function(){
        var _this = this;
        var menu = MenuButton.prototype.createMenu.call(this);
        menu.addClass('vjs-settings-menu');
        menu.addClass('vjs-menu-popup-on-click');
        // videojs removes the locking state on menu item click that causes
        // settings button to hide without updating buttonPressed state
        menu.children().forEach(function(component){
            component.on('click', function(){ _this.handleClick(); });
        });
        return menu;
    },
    handleClick: function(){
        if (this.buttonPressed_)
            this.unpressButton();
        else
            this.pressButton();
    },
    updateState: function(){
        this.player_.toggleClass('vjs-settings-expanded', this.buttonPressed_);
    },
    unpressButton: function(){
        MenuButton.prototype.unpressButton.call(this);
        this.updateState();
        this.clearInterval(this.activityInterval);
    },
    pressButton: function(){
        MenuButton.prototype.pressButton.call(this);
        this.updateState();
        // prevent setting vjs-user-inactive when menu is opened
        this.activityInterval = this.setInterval(
            this.player_.reportUserActivity.bind(this.player_), 250);
    },
    tooltipHandler: function(){
        return this.icon_;
    },
    updateSelected: function(){
        var _this = this;
        var player = this.player_;
        var current_src = player.cache_.src;
        var hola = window.hola_cdn;
        var wrapper = hola && hola.wrapper && find(hola.wrapper, function(w){
            return w.player && w.player.vjs==player;
        });
        // in case of hola_cdn attached get origin video url instead of blob
        if (wrapper && wrapper.player)
            current_src = wrapper.player.get_url();
        var items = this.menu.children();
        items.forEach(function(item){
            item.selected(item.options_.src ? item.options_.src==current_src :
                item.options_.level_id==_this.selectedLevel);
        });
        if (this.selectedLevel!==undefined)
        {
            var auto = find(items, function(item){
                return item.options_.level_id==-1;
            });
            if (!auto)
                return;
            var levels = (this.options_.quality||{}).sources||[];
            var curLevel = this.currentLevel!==undefined && find(levels,
                function(l){ return l.level_id==_this.currentLevel; });
            auto.setMinorText(this.selectedLevel==-1 && curLevel ?
                curLevel.label : '');
        }
    },
    levelsChanged: function(levels){
        var current = (this.options_.quality||{}).sources||[];
        if (current.length!=levels.length)
            return true;
        for (var i=0; i<levels.length; i++)
        {
            if (current[i].level_id!=levels[i].id)
                return true;
        }
        return false;
    },
    updateQuality: function(data){
        var sources = [];
        var callback = data.callback;
        var levels = data.quality.list;
        this.selectedLevel = data.quality.selected;
        this.currentLevel = data.quality.current;
        var quality = this.options_.quality = this.options_.quality||{};
        if (this.levelsChanged(levels) || callback!=quality.callback)
        {
            levels.forEach(function(item){
                sources.push({level_id: item.id, label: item.label});
            });
            quality.sources = sources;
            quality.callback = callback;
            this.update();
        }
        this.updateSelected();
    }
}));
var Component = vjs.getComponent('Component');
vjs.registerComponent('Overlay', vjs.extend(Component, {
    createEl: function(type, props){
        var custom_class = this.options_['class'];
        custom_class = custom_class ? ' '+custom_class : '';
        var proto_component = Component.prototype;
        var container = proto_component.createEl.call(this, 'div',
            vjs.mergeOptions({className: 'vjs-info-overlay'+custom_class},
            props));
        this.createContent(container);
        return container;
    },
    createContent: function(){},
}));
function round(val){
    if (typeof val!='number')
        return val;
    return val.toFixed(3);
}
function is_wrapper_attached(check_bws){
    var hola = window.hola_cdn;
    return hola && hola.get_wrapper() && (!check_bws || !!hola._get_bws());
}
var Overlay = vjs.getComponent('Overlay');
vjs.registerComponent('InfoOverlay', vjs.extend(Overlay, {
    constructor: function(player, options){
        this.info_data = {
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
        };
        Overlay.call(this, player, options);
    },
    createContent: function(container){
        var _this = this;
        var player = this.player_;
        function create_el(el, opt){
            opt = opt ? vjs.mergeOptions(opt) : opt;
            var proto_component = Component.prototype;
            return proto_component.createEl.call(_this, el, opt);
        }
        var title = create_el('div', {
            className: 'vjs-info-overlay-title',
            innerHTML: 'Technical info',
        });
        var close_btn = create_el('div', {className: 'vjs-info-overlay-x'});
        var close = this.toggle.bind(this, null, true);
        close_btn.addEventListener('click', close);
        close_btn.addEventListener('touchend', close);
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
    toggle: function(caller, hide){
        if (caller)
            this.last_caller = caller;
        if (this.visible||hide)
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
            opt = opt ? vjs.mergeOptions(opt) : opt;
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
        var label = this.localize(this.options_.label);
        var el = prot.createEl.call(this, 'li', vjs.mergeOptions({
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
        this.link.addEventListener('touchstart', function(e){
            e.stopPropagation(); });
        return el;
    },
    handleClick: function(e){ e.stopPropagation(); },
}));
var MenuItemLink = vjs.getComponent('MenuItemLink');
vjs.registerComponent('ReportButton', vjs.extend(MenuItem, {
    is_visible: is_wrapper_attached,
    handleClick: function(){
        this.player_.trigger({type: 'problem_report'});
        var overlay;
        if (overlay = this.player_.getChild('NotifyOverlay'))
            overlay.flash();
        this.selected(false);
    },
}));
var ReportButton = vjs.getComponent('ReportButton');
vjs.registerComponent('LogButton', vjs.extend(MenuItem, {
    is_visible: is_wrapper_attached,
    handleClick: function(){
        this.player_.trigger({type: 'save_logs'});
        this.selected(false);
    },
}));
var LogButton = vjs.getComponent('LogButton');
vjs.registerComponent('GraphButton', vjs.extend(MenuItem, {
    is_visible: is_wrapper_attached.bind(null, true),
    handleClick: function(){
        this.player_.trigger({type: 'cdn_graph_overlay'});
        this.selected(false);
    },
}));
var GraphButton = vjs.getComponent('GraphButton');
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
        this.on('tap', function(e){
            this.clipboard.onClick({currentTarget: e.target});
        });
    },
    dispose: function(){
        this.clipboard.destroy();
        MenuItem.prototype.dispose.call(this);
    },
    is_visible: is_wrapper_attached,
}));
var CopyLogButton = vjs.getComponent('CopyLogButton');
vjs.registerComponent('InfoButton', vjs.extend(MenuItem, {
    handleClick: function(){
        var overlay;
        if (overlay = this.player_.getChild('InfoOverlay'))
            overlay.toggle(this);
    },
}));
var InfoButton = vjs.getComponent('InfoButton');
vjs.registerComponent('QualityButton', vjs.extend(MenuItem, {
    constructor: function(player, options){
        options = vjs.mergeOptions({selectable: true}, options);
        MenuItem.call(this, player, options);
        if (options['default'])
            this.player_.src(options.src);
    },
    handleClick: function(){
        if (this.hasClass('vjs-selected'))
            return;
        var player = this.player_;
        var quality = this.options_;
        var level_id = quality.level_id;
        var event, event_name = 'beforeresolutionchange';
        try { event = new window.CustomEvent(event_name); }
        catch(e){
            // XXX stanislav: IE 11 fix
            event = document.createEvent('CustomEvent');
            event.initCustomEvent(event_name, true, true, {});
        }
        player.trigger(event, quality);
        if (event.defaultPrevented)
            return;
        if (level_id!==undefined)
        {
            if (quality.callback)
                quality.callback(level_id);
            player.trigger('resolutionchange');
            return;
        }
        var current_time = player.currentTime();
        var remain_paused = player.paused();
        player.pause();
        player.src(quality.src);
        player.ready(function(){
            player.one('loadeddata', function(){
                if (player.techName_=='Html5')
                {
                    player.currentTime(current_time);
                    return;
                }
                // XXX andrey: if seek immediately, video can stuck
                // or play without sound, probably loadeddata is triggered
                // when flash NetStream is not ready to seek yet
                player.on('timeupdate', function on_timeupdate(){
                    if (!player.currentTime())
                        return;
                    player.off('timeupdate', on_timeupdate);
                    player.currentTime(current_time);
                });
            });
            player.trigger('resolutionchange');
            if (!remain_paused)
            {
                player.load();
                player.play();
            }
        });
    },
    createEl: function(){
        var el = MenuItem.prototype.createEl.apply(this, arguments);
        this.minorLabel = document.createElement('span');
        el.appendChild(this.minorLabel);
        return el;
    },
    setMinorText: function(label){
        this.minorLabel.innerHTML = label ? ' '+label : '';
    },
}));
var QualityButton = vjs.getComponent('QualityButton');

vjs.plugin('settings', function(opt){
    var video = this;
    opt = vjs.mergeOptions({
        info: true,
        report: true,
        quality: false,
        volume: {level: 1, mute: !!video.options_.muted},
        debugging: true,
        about: true,
    }, opt);
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
                    source_def ? sources[i]===source_def : false;
            }
            return sources;
        }
        function add_settings_button(){
            return video.controlBar.addChild('SettingsButton',
                vjs.mergeOptions(opt));
        }
        // XXX bahaa/alexeym: make it an opt instead of detecting provider
        var is_hls_provider = video.tech_ &&
            (video.tech_.flashlsProvider||video.tech_.hlsProvider);
        if (opt.quality===true)
            opt.quality = {sources: video.options_.sources};
        if (opt.quality && !is_hls_provider)
        {
            var quality_key = 'vjs5_quality';
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
        if (opt.quality && opt.quality.sources && opt.quality.sources.length>1)
            settings_button = add_settings_button();
        if (opt.quality && is_hls_provider)
        {
            video.tech_.on('loadedqualitydata', function(e, data){
                var sources = data && data.quality && data.quality.list || [];
                if (sources.length<2)
                    return;
                if (!settings_button)
                    settings_button = add_settings_button();
                settings_button.updateQuality(data);
            });
        }
        if (opt.info)
            video.addChild('InfoOverlay', {}).addClass('vjs-hidden');
        if (opt.report)
        {
            video.addChild('NotifyOverlay', {'class': 'vjs-notify-overlay'})
            .addClass('vjs-hidden');
        }
        if (opt.volume)
        {
            var volume_key = 'vjs5_volume', mute_key = 'vjs5_mute';
            // quality configuration above might have reset the source
            // thus make sure video is ready before changing the volume
            video.ready(function(){
                if (!opt.volume.override_local_storage)
                {
                    var ls_level, ls_mute;
                    if ((ls_level = local_storage_get(volume_key))!=null)
                        opt.volume.level = ls_level;
                    if ((ls_mute = local_storage_get(mute_key))!=null)
                        opt.volume.mute = ls_mute=='true';
                }
                video.volume(opt.volume.level);
                video.muted(opt.volume.mute);
            });
            video.on('volumechange', function(){
                local_storage_set(volume_key, video.volume());
                local_storage_set(mute_key, video.muted());
            });
        }
        var menu = video.addChild('PopupMenu', vjs.mergeOptions(opt));
        video.on('hola.wrapper_attached', menu.check_items.bind(menu));
        video.on('hola.wrapper_detached', menu.check_items.bind(menu));
    });
    video.on('dblclick', function(e){
        if (!video.tech_ || video.tech_.el()!=e.target)
            return;
        if (video.isFullscreen())
            video.exitFullscreen();
        else
            video.requestFullscreen();
    });
});

}(window, window.videojs));
