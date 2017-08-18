(function(window, vjs){
'use strict';
require('@hola.org/videojs-utils');
var Clipboard = require('clipboard');
var find = require('lodash/find');
var settings_icon_svg = '<svg viewBox="0 0 36 36">'
    +'<path d="m 23.94,18.78 c .03,-0.25 .05,-0.51 .05,-0.78 0,'
    +'-0.27 -0.02,-0.52 -0.05,-0.78 l 1.68,-1.32 c .15,-0.12 .19,-0.33 .09,'
    +'-0.51 l -1.6,-2.76 c -0.09,-0.17 -0.31,-0.24 -0.48,-0.17 l -1.99,.8 c '
    +'-0.41,-0.32 -0.86,-0.58 -1.35,-0.78 l -0.30,-2.12 c -0.02,-0.19 -0.19,'
    +'-0.33 -0.39,-0.33 l -3.2,0 c -0.2,0 -0.36,.14 -0.39,.33 l -0.30,2.12 c '
    +'-0.48,.2 -0.93,.47 -1.35,.78 l -1.99,-0.8 c -0.18,-0.07 -0.39,0 -0.48,'
    +'.17 l -1.6,2.76 c -0.10,.17 -0.05,.39 .09,.51 l 1.68,1.32 c -0.03,.25 '
    +'-0.05,.52 -0.05,.78 0,.26 .02,.52 .05,.78 l -1.68,1.32 c -0.15,.12 '
    +'-0.19,.33 -0.09,.51 l 1.6,2.76 c .09,.17 .31,.24 .48,.17 l 1.99,-0.8 c '
    +'.41,.32 .86,.58 1.35,.78 l .30,2.12 c .02,.19 .19,.33 .39,.33 l 3.2,0 c '
    +'.2,0 .36,-0.14 .39,-0.33 l .30,-2.12 c .48,-0.2 .93,-0.47 1.35,-0.78 l '
    +'1.99,.8 c .18,.07 .39,0 .48,-0.17 l 1.6,-2.76 c .09,-0.17 .05,-0.39 '
    +'-0.09,-0.51 l -1.68,-1.32 0,0 z m -5.94,2.01 c -1.54,0 -2.8,-1.25 -2.8,'
    +'-2.8 0,-1.54 1.25,-2.8 2.8,-2.8 1.54,0 2.8,1.25 2.8,2.8 0,1.54 -1.25,'
    +'2.8 -2.8,2.8 l 0,0 z"/>'
    +'</svg>';
function extend_component(name, parent, comp){
    vjs.registerComponent(name, vjs.extend(vjs.getComponent(parent), comp));
    return vjs.getComponent(name);
}
var Menu = vjs.getComponent('Menu');
extend_component('PopupMenu', 'Menu', {
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
});
var SubMenu = extend_component('SubMenu', 'Menu', {
    constructor: function(player, options, parent){
        Menu.call(this, player, options);
        this.parent = parent;
        this.createMenuItem();
        if (this.className)
            this.addClass(this.className);
        this.update();
    },
    createMenuItem: function(){
        if (!this.title)
            return;
        var player = this.player(), _this = this;
        var item = this.menuItem = new MenuItem(player, {label: this.title});
        var span = vjs.createEl('span', {className: 'vjs-menu-item-content'});
        item.minorLabel = vjs.createEl('span', {className: 'vjs-minor-label'});
        item.contentLabel = vjs.createEl('span');
        span.appendChild(item.contentLabel);
        span.appendChild(item.minorLabel);
        item.el().insertBefore(span, item.el().firstChild);
        item.on(['tap', 'click'], function(){
            _this.parent.setActive(_this); });
    },
    createEl: function(){
        var el = Component.prototype.createEl.call(this, 'div',
            {className: 'vjs-menu-content'});
        el.setAttribute('role', 'menu');
        return el;
    },
    update: function(){
        this.children().forEach(this.removeChild.bind(this));
        if (this.title)
        {
            var title = new MenuItem(this.player_, {label: this.title});
            title.addClass('vjs-submenu-title');
            var _this = this;
            title.on(['tap', 'click'], function(){
                _this.parent.selectMain();
            });
            this.addChild(title);
        }
        if (this.createItems)
            this.createItems();
    },
});
var QualitySubMenu = extend_component('QualitySubMenu', 'SubMenu', {
    className: 'vjs-quality-submenu',
    title: 'Quality',
    constructor: function(player, options, parent){
        var _this = this, tech = player.tech_;
        SubMenu.call(this, player, options, parent);
        this.one(player, 'play', this.updateSelected);
        this.on(player, 'resolutionchange', this.updateSelected);
        this.updateSelected();
        if (tech)
        {
            tech.on('loadedqualitydata', function(e, data){
                _this.updateQuality(data); });
            if (tech.quality_data)
                this.updateQuality(tech.quality_data);
        }
    },
    createItems: function(){
        var player = this.player(), _this = this;
        var quality = this.options_.quality;
        var sources = quality && quality.sources ? quality.sources :
            player.options_.sources;
        if (quality===false || !sources || sources.length<2)
            return void this.menuItem.hide();
        this.menuItem.show();
        for (var i=0; i<sources.length; i++)
        {
            var label = sources[i].label || (sources.length==1 ?
                'Auto' : 'Source '+(i+1));
            var item = new QualityMenuItem(player, vjs.mergeOptions(
                sources[i], {label: label, callback: quality.callback}));
            item.on(['tap', 'click'], function(){
                _this.handleItemClick(this); });
            this.addChild(item);
        }
    },
    handleItemClick: function(item){
        var player = this.player();
        this.parent.settings_button.unpressButton();
        if (item.hasClass('vjs-selected'))
            return;
        var quality = item.options_;
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
                    return void player.currentTime(current_time);
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
        var items = this.children(), selected_label;
        items.forEach(function(item){
            if (!(item instanceof QualityMenuItem))
                return;
            var selected = item.options_.src ? item.options_.src==current_src :
                item.options_.level_id==_this.selectedLevel;
            item.selected(selected);
            if (selected)
                selected_label = item.options_.label;
        });
        var current_label;
        if (this.selectedLevel==-1 && this.currentLevel!==undefined)
        {
            var levels = (this.options_.quality||{}).sources||[];
            var cur = find(levels, function(l){
                return l.level_id==_this.currentLevel; });
            current_label = cur ? cur.label : '';
        }
        var type = quality_type(current_label || selected_label);
        this.menuItem.contentLabel.innerHTML = selected_label||'';
        this.menuItem.minorLabel.innerHTML = current_label||'';
        this.menuItem.toggleClass('vjs-quality-hd', type=='hd');
        this.menuItem.toggleClass('vjs-quality-4k', type=='4k');
        this.parent.settings_button.toggleClass('vjs-quality-hd', type=='hd');
        this.parent.settings_button.toggleClass('vjs-quality-4k', type=='4k');
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
        var levels = data.quality.list.slice().sort(function(a, b){
            return b.id==-1 ? -1 : a.id==-1 ? 1 : b.bitrate-a.bitrate; });
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
});
function quality_type(label){
    var m = label && label.match(/(\d+)p/);
    var q = m && parseInt(m[1], 10);
    return q>=2160 ? '4k' : q>=720 ? 'hd' : null;
}
function is_hls_provider(player){
    // XXX bahaa/alexeym: make it an opt instead of detecting provider
    return player.tech_ && (player.tech_.flashlsProvider ||
        player.tech_.hlsProvider);
}
var QualityMenuItem = extend_component('QualityMenuItem', 'MenuItem', {
    constructor: function(player, options){
        options = vjs.mergeOptions({selectable: true}, options);
        MenuItem.call(this, player, options);
        var qt;
        if (qt = quality_type(options.label))
            this.addClass('vjs-quality-'+qt);
        if (options['default'])
            this.player_.src(options.src);
    },
    handleClick: function(){},
});
var SpeedSubMenu = extend_component('SpeedSubMenu', 'SubMenu', {
    className: 'vjs-speed-submenu',
    title: 'Speed',
    constructor: function(player, options, parent){
        SubMenu.call(this, player, options, parent);
        this.on(player, 'ratechange', this.handleRateChange);
        this.handleRateChange();
    },
    createItems: function(){
        var _this = this, player = this.player();
        var rates = player.tech_ && player.tech_.featuresPlaybackRate ?
            [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] : [1];
        rates.forEach(function(rate){
            var item = new MenuItem(player, {
                label: rate==1 ? 'Normal' : rate,
                selectable: true,
                rate: rate,
            });
            item.on(['tap', 'click'], function(){
                _this.parent.selectMain();
                if (rate!=player.playbackRate())
                    player.playbackRate(rate);
            });
            _this.addChild(item);
        });
    },
    handleRateChange: function(){
        var rate = this.player().playbackRate();
        this.menuItem.contentLabel.innerHTML = rate==1 ? 'Normal' : rate;
        this.children().forEach(function(item){
            if (!item.options_.rate)
                return;
            item.selected(item.options_.rate==rate);
        });
    },
});
var SettingsMenu = extend_component('SettingsMenu', 'Menu', {
    className: 'vjs-settings-menu',
    constructor: function(player, options, settings_button){
        Menu.call(this, player, options);
        this.settings_button = settings_button;
        this.addClass(this.className);
        this.update();
        this.on(['tap', 'click', 'touchstart', 'touchend'], function(event){
            event.preventDefault();
            event.stopPropagation();
        });
    },
    createEl: function(){
        var el = Component.prototype.createEl.call(this, 'div',
            {className: 'vjs-menu'});
        el.setAttribute('role', 'presentation');
        return el;
    },
    update: function(){
        this.children().forEach(this.removeChild.bind(this));
        this.createItems();
    },
    addSubMenu: function(menu){
        this.addChild(menu);
        if (menu.menuItem)
            this.mainMenu.addChild(menu.menuItem);
    },
    createItems: function(){
        this.mainMenu = new SubMenu(this.player_, this.options_, this);
        this.mainMenu.addClass('vjs-main-submenu');
        this.addChild(this.mainMenu);
        this.addSubMenu(new SpeedSubMenu(this.player_, this.options_, this));
        this.addSubMenu(new QualitySubMenu(this.player_, this.options_, this));
        this.selectMain(true);
    },
    selectMain: function(no_transition){
        this.setActive(this.mainMenu, no_transition);
    },
    show: function(visible){
        if (visible)
        {
            this.el_.style.height = '';
            this.el_.style.width = '';
            this.selectMain(true);
            this.addClass('vjs-lock-showing');
            return;
        }
        var _this = this;
        this.el_.style.opacity = '0';
        this.setTimeout(function(){
            this.el_.style.opacity = '';
            _this.removeClass('vjs-lock-showing');
        }, 100);
    },
    getSize: function(){
        return {width: this.el_.offsetWidth, height: this.el_.offsetHeight};
    },
    setSize: function(size){
        this.el_.style.height = size ? size.height+'px' : '';
        this.el_.style.width = size ? size.width+'px' : '';
    },
    setActive: function(menu, no_transition){
        if (!no_transition && window.requestAnimationFrame)
        {
            var _this = this, old_size = this.getSize();
            this.el_.style.visibility = 'hidden';
            window.requestAnimationFrame(function(){
                var new_size = _this.getSize();
                _this.setSize(old_size);
                _this.el_.style.visibility = '';
                _this.addClass('vjs-size-transition');
                window.requestAnimationFrame(function(){
                    var on_end = function(){
                        _this.removeClass('vjs-size-transition');
                        _this.setSize();
                        _this.clearTimeout(timeout);
                    };
                    _this.setSize(new_size);
                    _this.one('transitionend', on_end);
                    var timeout = _this.setTimeout(on_end, 300);
                });
            });
        }
        this.children().forEach(function(item){
            item.toggleClass('vjs-active-submenu', item==menu);
        });
    },
});
var MenuButton = vjs.getComponent('MenuButton');
extend_component('SettingsButton', 'MenuButton', {
    controlText_: 'Settings',
    update: function(){
        var player = this.player_;
        var menu = new SettingsMenu(player, this.options_, this);
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
        var el = MenuButton.prototype.createEl.call(this);
        this.icon_ = vjs.createEl('div', {className: 'vjs-button-icon',
            innerHTML: settings_icon_svg});
        el.insertBefore(this.icon_, el.firstChild);
        return el;
    },
    buildCSSClass: function(){
        var className = MenuButton.prototype.buildCSSClass.call(this);
        return className+' vjs-settings-button';
    },
    handleClick: function(){
        if (this.buttonPressed_)
            this.unpressButton();
        else
            this.pressButton();
    },
    updateState: function(){
        this.player_.toggleClass('vjs-settings-expanded', this.buttonPressed_);
        this.el_.setAttribute('aria-expanded', this.buttonPressed_);
        this.menu.show(this.buttonPressed_);
    },
    unpressButton: function(){
        if (!this.enabled_)
            return;
        this.buttonPressed_ = false;
        this.updateState();
        this.el_.focus();
        this.clearInterval(this.activityInterval);
        if (this.clickListener)
        {
            vjs.off(document, ['tap', 'click'], this.clickListener);
            this.player_.off(['tap', 'click'], this.clickListener);
            this.clickListener = null;
        }
    },
    pressButton: function(){
        if (!this.enabled_)
            return;
        this.buttonPressed_ = true;
        this.updateState();
        this.menu.focus();
        // prevent setting vjs-user-inactive when menu is opened
        this.activityInterval = this.setInterval(
            this.player_.reportUserActivity.bind(this.player_), 250);
        var _this = this;
        this.setTimeout(function(){
            _this.clickListener = _this.unpressButton.bind(_this);
            vjs.on(document, ['tap', 'click'], this.clickListener);
            _this.player_.on(['tap', 'click'], this.clickListener);
        });
    },
    tooltipHandler: function(){
        return this.icon_;
    },
});
var Component = vjs.getComponent('Component');
var Overlay = extend_component('Overlay', 'Component', {
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
});
function round(val){
    if (typeof val!='number')
        return val;
    return val.toFixed(3);
}
function is_wrapper_attached(check_bws){
    var hola = window.hola_cdn;
    return hola && hola.get_wrapper() && (!check_bws || !!hola._get_bws());
}
extend_component('InfoOverlay', 'Overlay', {
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
                        for (var i=0; i<range.length; i++)
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
                        for (var i=0; i<range.length; i++)
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
});
extend_component('NotifyOverlay', 'Overlay', {
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
});
var MenuItem = vjs.getComponent('MenuItem');
var MenuItemLink = extend_component('MenuItemLink', 'MenuItem', {
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
});
var ReportButton = extend_component('ReportButton', 'MenuItem', {
    is_visible: is_wrapper_attached,
    handleClick: function(){
        this.player_.trigger({type: 'problem_report'});
        var overlay;
        if (overlay = this.player_.getChild('NotifyOverlay'))
            overlay.flash();
        this.selected(false);
    },
});
var LogButton = extend_component('LogButton', 'MenuItem', {
    is_visible: is_wrapper_attached,
    handleClick: function(){
        this.player_.trigger({type: 'save_logs'});
        this.selected(false);
    },
});
var GraphButton = extend_component('GraphButton', 'MenuItem', {
    is_visible: is_wrapper_attached.bind(null, true),
    handleClick: function(){
        this.player_.trigger({type: 'cdn_graph_overlay'});
        this.selected(false);
    },
});
var CopyLogButton = extend_component('CopyLogButton', 'MenuItem', {
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
});
var InfoButton = extend_component('InfoButton', 'MenuItem', {
    handleClick: function(){
        var overlay;
        if (overlay = this.player_.getChild('InfoOverlay'))
            overlay.toggle(this);
    },
});

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
            for (i=0; i<sources.length; i++)
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
            for (i=0; i<sources.length; i++)
            {
                sources[i]['default'] =
                    source_sav ? sources[i]===source_sav :
                    source_def ? sources[i]===source_def : false;
            }
            return sources;
        }
        if (opt.quality===true)
            opt.quality = {sources: video.options_.sources};
        if (opt.quality && !is_hls_provider(video))
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
        video.controlBar.addChild('SettingsButton', vjs.mergeOptions(opt));
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
});

}(window, window.videojs));
