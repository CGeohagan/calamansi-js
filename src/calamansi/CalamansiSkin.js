class CalamansiSkin
{
    constructor(calamansi, path) {
        this.calamansi = calamansi;
        this.path = path;

        this.el = calamansi.el;

        // State
        this.mouseDownTarget = null;
    }

    async init() {
        // Load and apply the skin
        const content = await this.load();

        // Set UI elements
        this.setUiElements(content);

        // Activate the player's controls
        this.activateControls();

        // Register event listeners
        this.addEventListeners();
    }

    async load() {
        this.loadCss(this.path);
        const skin = await this.fetchHtml(this.path);
        const content = this.el.innerHTML;

        // Prepare the DOM for the player instance using the skin's HTML
        let wrapper = document.createElement('div');
        wrapper.innerHTML = skin.trim();

        if (wrapper.firstChild.dataset.noWrapper) {
            wrapper = wrapper.firstChild;

            delete wrapper.dataset.noWrapper;
        }

        wrapper.classList.add('calamansi');
        wrapper.id = this.calamansi.id;

        // Replace the provided element with the compiled HTML
        this.el.parentNode.replaceChild(wrapper, this.el);
        this.el = wrapper;

        // Load the JS after all the new elements have been appended
        this.loadJs(this.path);

        return content;
    }

    /**
     * Append a <link> with the skin's CSS to the page if this skin's CSS has
     * not been appended yet
     * 
     * @param {*} path 
     */
    loadCss(path) {
        const cssPath = `${path}/skin.css`;

        // If the skin's CSS has already been loaded
        if (document.querySelectorAll(`link[href="${cssPath}"]`).length > 0) {
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssPath;

        document.querySelector('head').appendChild(link);
    }

    /**
     * Append a <script> with the skin's JS to the page if this skin's JS has
     * not been appended yet
     * 
     * @param {*} path 
     */
    loadJs(path) {
        const jsPath = `${path}/skin.js`;

        // If the skin's CSS has already been loaded
        if (document.querySelectorAll(`script[src="${jsPath}"]`).length > 0) {
            return;
        }

        const script = document.createElement('script');
        script.setAttribute('src', jsPath);
        script.setAttribute('type', 'text/javascript');

        document.querySelector('head').appendChild(script);
    }

    async fetchHtml(path) {
        return fetch(`${path}/skin.html`)
            .then(data => {
                if (data.status != 200) {
                    throw `Skin at path "${path}" not found!`;
                }

                return data.text();
            })
            .then(html => {
                html = html.trim();

                // Remove all the new lines
                while (html.search("\n") >= 0) {
                    html = html.replace(/\n/, '');
                }

                // Remove all the double spaces
                while (html.search('  ') >= 0) {
                    html = html.replace(/  /, '');
                }

                return html;
            });
    }

    setUiElements(content) {
        // Insert the element's content inside the skin's content slot
        const contentSlots = document.querySelectorAll(`#${this.el.id} .slot--content`);

        if (contentSlots && contentSlots.length > 0) {
            contentSlots.forEach(slot => {
                slot.innerHTML = content;
            });
        }

        this.updateCheckboxes();

        // Update the list of playlist
        this.updatePlaylistList();

        // Set up the playlist
        this.updatePlaylist();

        // Set the track info fields
        this.updateTrackInfo();
    }

    activateControls() {
        this.el.addEventListener('mousedown', (event) => {
            this.mouseDownTarget = event.target;
        });

        document.addEventListener('mouseup', (event) => {
            this.mouseDownTarget = null;
        });

        this.el.addEventListener('touchstart', (event) => {
            this.mouseDownTarget = event.target;
        });

        document.addEventListener('touchend', (event) => {
            this.mouseDownTarget = null;
        });

        this.el.addEventListener('click', (event) => {
            if (event.target.type !== 'checkbox') {
                event.preventDefault();
            }

            // Audio (playback) controls
            if (this.calamansi.audio) {
                if (this.containsClass(event.target, 'control-play')) {
                    // "Play" button - start playback from 00:00
                    this.calamansi.audio.playFromStart();
                } else if (this.containsClass(event.target, 'control-resume')) {
                    // "Play" button - start or resume playback
                    this.calamansi.audio.play();
                } else if (this.containsClass(event.target, 'control-pause')) {
                    // "Pause" button
                    this.calamansi.audio.pause();
                } else if (this.containsClass(event.target, 'control-stop')) {
                    // "Stop" button
                    this.calamansi.audio.stop();
                } else if (this.containsClass(event.target, 'control-next-track')) {
                    // "Next Track" button
                    this.calamansi.nextTrack();
                } else if (this.containsClass(event.target, 'control-prev-track')) {
                    // "Previoud Track" button
                    this.calamansi.prevTrack();
                } else if (this.containsClass(event.target, 'control-toggle-loop')) {
                    // "Loop" button (checkbox)
                    this.calamansi.toggleLoop();
                } else if (this.containsClass(event.target, 'control-toggle-shuffle')) {
                    // "Shuffle" button (checkbox)
                    this.calamansi.toggleShuffle();
                } else if (this.containsClass(event.target, 'slider')) {
                    const parent = this.findElParent(event.target, 'slider');

                    let position;

                    if (parent.classList.contains('slider-vertical')) {
                        position = 1 - ((event.clientY - parent.getBoundingClientRect().y) / parent.clientHeight);
                    } else {
                        position = (event.clientX - parent.getBoundingClientRect().x) / parent.clientWidth;
                    }

                    this.onSliderPositionChanged(parent, position);
                }
            }
        });

        document.addEventListener('mousemove', (event) => {
            // Audio (playback) controls
            if (this.calamansi.audio && this.mouseDownTarget) {
                if (this.containsClass(this.mouseDownTarget, 'slider')) {
                    // Smooth seeking
                    const parent = this.findElParent(this.mouseDownTarget, 'slider');

                    let position;

                    if (parent.classList.contains('slider-vertical')) {
                        position = 1 - ((event.clientY - parent.getBoundingClientRect().y) / parent.clientHeight);
                    } else {
                        position = (event.clientX - parent.getBoundingClientRect().x) / parent.clientWidth;
                    }

                    if (position > 1.0) {
                        position = 1;
                    } else if (position < 0) {
                        position = 0;
                    }

                    this.onSliderPositionChanged(parent, position);
                }
            }
        });

        document.addEventListener('touchmove', (event) => {
            // Audio (playback) controls
            if (this.calamansi.audio && this.mouseDownTarget) {
                if (this.containsClass(this.mouseDownTarget, 'slider')) {
                    // Smooth seeking
                    const parent = this.findElParent(this.mouseDownTarget, 'slider');

                    let position;

                    if (parent.classList.contains('slider-vertical')) {
                        position = 1 - ((event.touches[0].clientY - parent.getBoundingClientRect().y) / parent.clientHeight);
                    } else {
                        position = (event.touches[0].clientX - parent.getBoundingClientRect().x) / parent.clientWidth;
                    }

                    if (position > 1.0) {
                        position = 1;
                    } else if (position < 0) {
                        position = 0;
                    }

                    this.onSliderPositionChanged(parent, position);
                }
            }
        });

        this.getEls('.playback-rate').forEach((el) => {
            el.addEventListener('change', (event) => {
                if (this.calamansi.audio) {
                    this.calamansi.audio.changePlaybackRate(parseFloat(el.value));
                }
            })
        });
    }

    addEventListeners() {
        this.calamansi.on('loadedmetadata', (instance) => {
            this.updatePlaybackDuration(instance.audio.duration);
            this.updatePlaylist();
        });

        this.calamansi.on('timeupdate', (instance) => {
            this.updatePlaybackTime(instance.audio.currentTime);

            this.updatePlaybackTimeLeft(
                instance.audio.currentTime, instance.audio.duration
            );

            this.updatePlaybackProgress(
                instance.audio.currentTime, instance.audio.duration
            );
        });

        this.calamansi.on('loadingProgress', (instance) => {
            this.updateLoadingProgress(instance.audio.loadedPercent);
        });

        this.calamansi.on('volumechange', (instance) => {
            this.updateVolume(instance.audio.volume);
        });

        this.calamansi.on('trackInfoReady', (instance, track) => {
            if (instance.currentTrack().source === track.source) {
                this.updateTrackInfo();
            }

            this.updatePlaylist();
        });

        this.calamansi.on('playlistLoaded', (instance) => {
            this.updatePlaylist();
        });

        this.calamansi.on('playlistReordered', (instance) => {
            this.updatePlaylist();
        });

        this.calamansi.on('trackSwitched', (instance) => {
            this.updateTrackInfo();

            this.updatePlaylistActiveTrack();
        });
    }

    /**
     * Updating the UI
     */
    getEl(selector) {
        return document.querySelector(`#${this.el.id} ${selector}`);
    }

    getEls(selector) {
        return document.querySelectorAll(`#${this.el.id} ${selector}`);
    }

    findEl(item, selector) {
        return item.querySelector(selector);
    }

    findEls(item, selector) {
        return item.querySelectorAll(selector);
    }

    findElParent(item, className) {
        if (!item.classList) {
            return null;
        }

        if (item.classList.contains(className)) {
            return item;
        }

        if (!item.parentNode) {
            return null;
        }

        return this.findElParent(item.parentNode, className);
    }

    containsClass(el, className) {
        return el.classList.contains(className) || this.findElParent(el, className);
    }

    onSliderPositionChanged(el, position) {
        if (el.classList.contains('playback-bar')) {
            this.calamansi.audio.seekTo(position * this.calamansi.audio.duration);
        } else if (el.classList.contains('volume-bar')) {
            this.calamansi.audio.changeVolume(position);
        }
    }

    updatePlaybackDuration(duration) {
        this.getEls('.playback-duration').forEach((el) => {
            el.innerText = this.formatTime(duration);
        });
    }

    updatePlaybackTime(currentTime) {
        this.getEls('.playback-time').forEach((el) => {
            el.innerText = this.formatTime(currentTime);
        });
    }

    updatePlaybackTimeLeft(time, duration) {
        this.getEls('.playback-time-left').forEach((el) => {
            const timeLeft = duration - Math.floor(time);

            el.innerText = '-' + this.formatTime(timeLeft);
        });
    }

    updatePlaybackProgress(time, duration) {
        const progress = (time / duration) * 100;
 
        this.getEls('.playback-progress').forEach((el) => {
            let parent = this.findElParent(el, 'slider');

            if (!parent) {
                return;
            }

            el.style[parent.classList.contains('slider-vertical') ? 'height' : 'width'] = progress + '%';
        });

        this.getEls('.playback-bar').forEach((el) => {
            el.title = `${this.formatTime(this.calamansi.audio.currentTime)} / ${this.formatTime(this.calamansi.audio.duration)}`;
        });
    }

    updateLoadingProgress(progress) {
        this.getEls('.playback-load').forEach((el) => {
            el.style.width = progress + '%';
        });
    }

    updateVolume(volume) {
        const els = this.getEls('.volume-value');

        els.forEach((el) => {
            let parent = this.findElParent(el, 'slider');

            if (!parent) {
                return;
            } 

            el.style[parent.classList.contains('slider-vertical') ? 'height' : 'width'] = (volume * 100) + '%';
        });
    }

    formatTime(seconds) {
        let hours = seconds > 1 ? Math.floor(seconds / 60 / 60) : 0;
        let minutes = seconds > 1 ? Math.floor(seconds / 60) : 0;

        if (minutes >= 60) {
            minutes -= hours * 60;
        }

        seconds = Math.floor(seconds);

        if (seconds >= 60) {
            seconds -= minutes * 60;
        }

        // Add trailing zeros if required
        if (seconds < 10) {
            seconds = `0${seconds}`;
        }

        if (minutes < 10) {
            minutes = `0${minutes}`;
        }

        if (hours < 10) {
            hours = `0${hours}`;
        }

        return hours != 0
            ? `${hours}:${minutes}:${seconds}`
            : `${minutes}:${seconds}`;
    }

    updateCheckboxes() {
        let el;

        // "Loop"
        this.getEls('.control-toggle-loop').forEach((el) => {
            el.checked = this.calamansi.options.loop;
        });

        // "Shuffle"
        this.getEls('.control-toggle-shuffle').forEach((el) => {
            el.checked = this.calamansi.options.shuffle;
        });
    }
    
    updatePlaylistList() {
        const el = this.getEl('.playlists');

        if (!el) {
            return;
        }

        for (let child of el.children) {
            el.removeChild(child);
        }

        for (let index in this.calamansi.playlists) {
            const playlist = this.calamansi.playlists[index];

            const option = document.createElement('option');
            option.value = index;
            option.innerText = playlist.name;

            el.appendChild(option);
        }

        el.addEventListener('change', (event) => {
            this.calamansi.switchPlaylist(el.value);
        });
    }

    updatePlaylist() {
        if (!this.calamansi.currentPlaylist()) {
            return;
        }
        
        this.getEls('.playlist').forEach((el) => {
            if (el.nodeName.toLowerCase() === 'table') {
                this.updatePlaylistTable(el);
            } else {
                this.updatePlaylistUl(el);
            }
        });
    }

    updatePlaylistUl(container) {
        // Remove the current list
        if (container.querySelector('ul')) {
            container.removeChild(container.querySelector('ul'))
        }

        const ul = document.createElement('ul');

        let template = this.findEl(container, '.playlist-item.template');
        
        if (template) {
            template = template.cloneNode(true);
            template.classList.remove('template');
        }

        let index = 0;
        for (let i of this.calamansi._currentPlaylistOrder) {
            const track = this.calamansi.currentPlaylist().list[i];
            let li = document.createElement('li');

            if (template) {
                const item = template.cloneNode(true);

                for (let key in track.info) {
                    let el = this.findEl(item, `.playlist-item--${key}`);

                    if (el) {

                        switch (key) {
                            case 'albumCover':
                                // TODO: Display album cover
                                break
                            case 'duration':
                                el.innerText = this.formatTime(track.info[key]);
                                el.title = this.formatTime(track.info[key]);
                                break;
                            default:
                                el.innerText = track.info[key];
                                el.title = track.info[key];
                        }
                    }
                }

                if (track === this.calamansi.currentTrack()) {
                    item.classList.add('active');
                }
                
                li.appendChild(item);
            } else {
                li.innerText = track.info.name;
                li.title = track.info.name;
            }

            li.classList.add('playlist-item-li');
            li.dataset.index = index;

            li.addEventListener('dblclick', (event) => {
                const el = this.findElParent(event.target, 'playlist-item-li');

                this.calamansi.switchTrack(parseInt(el.dataset.index), true);
            });

            ul.appendChild(li);

            index++;
        }

        container.appendChild(ul);
    }

    updatePlaylistTable(table) {        
        while (this.findEl(table, 'tbody')) {
            table.removeChild(this.findEl(table, 'tbody'));
        }

        const tbody = document.createElement('tbody');

        let index = 0;
        for (let i of this.calamansi._currentPlaylistOrder) {
            const track = this.calamansi.currentPlaylist().list[i];
            const tr = document.createElement('tr');
            tr.classList.add('playlist-item');

            for (let th of this.findEls(table, 'th')) {
                const td = document.createElement('td');
                const key = th.classList[0];

                td.classList.add(`playlist-item--${key}`);

                if (track.info[key]) {
                    switch (key) {
                        case 'albumCover':
                            // TODO: Display album cover
                            break
                        case 'duration':
                            td.innerText = this.formatTime(track.info[key]);
                            td.title = this.formatTime(track.info[key]);
                            break;
                        default:
                            td.innerText = track.info[key];
                            td.title = track.info[key];
                    }
                }

                tr.appendChild(td);
            }

            if (track === this.calamansi.currentTrack()) {
                tr.classList.add('active');
            }

            tr.dataset.index = index;

            tr.addEventListener('dblclick', (event) => {
                const el = this.findElParent(event.target, 'playlist-item');

                this.calamansi.switchTrack(parseInt(el.dataset.index), true);
            });

            tbody.appendChild(tr);
            
            index++;
        }

        table.appendChild(tbody);
    }

    updatePlaylistActiveTrack() {
        this.getEls('.playlist-item.active').forEach((active) => {
            active.classList.remove('active');

            let newActive = this.getEls('.playlist-item:not(.template)')[this.calamansi._currentTrack];

            if (newActive) {
                newActive.classList.add('active');
            }
        });
    }

    updateTrackInfo() {
        if (!this.calamansi.currentTrack() || !this.calamansi.currentTrack().info) {
            return;
        }

        const info = this.calamansi.currentTrack().info;

        this.getEls('.track-info').forEach((el) => {
            let key = null;

            for (let i = 0; i < el.classList.length; i++) {
                if (/track-info--.*/.test(el.classList[i])) {
                    key = el.classList[i].split('--')[1];

                    break;
                }
            }

            if (!key) {
                return;
            }
            
            if (key === 'albumCover') {
                if (el.nodeName.toLowerCase() === 'img') {
                    el.src = info[key]
                        ? info[key].base64
                        : this.calamansi.options.defaultAlbumCover;
                } else {
                    el.style.backgroundImage = `url('${info[key] ? info[key].base64 : this.calamansi.options.defaultAlbumCover}')`;
                }

                return;
            }

            el.innerHTML = info[key] ? info[key] : '&nbsp;';
            el.title = info[key] ? info[key] : '';
        });
    }
}

export default CalamansiSkin;