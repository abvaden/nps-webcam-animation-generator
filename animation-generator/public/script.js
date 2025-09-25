class GalleryApp {
    constructor() {
        this.currentView = 'parks';
        this.currentPark = null;
        this.currentWebcam = null;
        this.currentFilter = 'all';
        this.currentGifs = [];
        this.currentGifIndex = 0;
        this.modal = null;
        this.modalVideo = null;
        this.config = null;
        this.init();
    }

    async init() {
        await this.loadConfig();
        await this.loadParks();
        this.setupEventListeners();
        this.setupModal();
    }

    async loadConfig() {
        try {
            const response = await fetch('/config');
            const data = await response.json();

            if (data.success) {
                this.config = data.config;
            } else {
                console.error('Failed to load configuration');
                this.showError('Failed to load configuration');
            }
        } catch (error) {
            console.error('Network error loading config:', error);
            this.showError('Network error loading configuration');
        }
    }

    setupEventListeners() {
        window.addEventListener('popstate', (e) => {
            if (e.state) {
                this.handleNavigation(e.state);
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.modal && this.modal.style.display !== 'none') {
                switch(e.key) {
                    case 'Escape':
                        this.closeModal();
                        break;
                    case 'ArrowLeft':
                        this.previousGif();
                        break;
                    case 'ArrowRight':
                        this.nextGif();
                        break;
                }
            }
        });
    }

    setupModal() {
        this.modal = document.getElementById('video-modal');
        this.modalVideo = document.getElementById('modal-video');

        // Close button
        const closeBtn = document.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.closeModal());

        // Navigation buttons
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        prevBtn.addEventListener('click', () => this.previousGif());
        nextBtn.addEventListener('click', () => this.nextGif());

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Prevent body scroll when modal is open
        this.modal.addEventListener('show', () => {
            document.body.style.overflow = 'hidden';
        });

        this.modal.addEventListener('hide', () => {
            document.body.style.overflow = '';
        });
    }

    async loadParks() {
        try {
            const response = await fetch('/gallery/parks');
            const data = await response.json();

            if (data.success) {
                this.renderParks(data.parks);
            } else {
                this.showError('Failed to load parks');
            }
        } catch (error) {
            this.showError('Network error loading parks');
        }
    }

    async loadWebcams(park) {
        try {
            const response = await fetch(`/gallery/parks/${encodeURIComponent(park)}/webcams`);
            const data = await response.json();

            if (data.success) {
                this.renderWebcams(data.park, data.webcams);
            } else {
                this.showError('Failed to load webcams');
            }
        } catch (error) {
            this.showError('Network error loading webcams');
        }
    }

    async loadGifs(webcamId, webcamName) {
        try {
            let url = `/gallery/webcams/${webcamId}/gifs`;
            if (this.currentFilter !== 'all') {
                url += `?type=${this.currentFilter}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                this.renderGifs(webcamId, webcamName, data.gifs);
            } else {
                this.showError('Failed to load GIFs');
            }
        } catch (error) {
            this.showError('Network error loading GIFs');
        }
    }

    renderParks(parks) {
        const content = document.getElementById('content');
        const breadcrumb = document.getElementById('breadcrumb');
        breadcrumb.style.display = 'none';

        content.innerHTML = `
            <div class="grid">
                ${parks.map(park => `
                    <div class="card" onclick="app.navigateToWebcams('${park.name}')">
                        <h3>🏔️ ${park.name}</h3>
                        <div class="card-stats">
                            <span>📹 ${park.webcam_count} Webcams</span>
                            <span>🎬 ${park.gif_count} GIFs</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderWebcams(park, webcams) {
        const content = document.getElementById('content');
        const breadcrumb = document.getElementById('breadcrumb');

        breadcrumb.style.display = 'block';
        breadcrumb.innerHTML = `
            <a href="#" onclick="app.navigateToParks()">🏠 Home</a> >
            🏔️ ${park}
        `;

        content.innerHTML = `
            <h2 style="color: white; margin-bottom: 30px; text-align: center;">${park} Webcams</h2>
            <div class="grid">
                ${webcams.map(webcam => `
                    <div class="card" onclick="app.navigateToGifs(${webcam.id}, '${webcam.display_name || webcam.name}')">
                        <h3>📹 ${webcam.display_name || webcam.name}</h3>
                        <div class="gif-types">
                            ${webcam.gif_counts.sunrise > 0 ? `<span class="gif-type">🌅 ${webcam.gif_counts.sunrise} Sunrise</span>` : ''}
                            ${webcam.gif_counts.sunset > 0 ? `<span class="gif-type">🌇 ${webcam.gif_counts.sunset} Sunset</span>` : ''}
                            ${webcam.gif_counts.hourly > 0 ? `<span class="gif-type">⏰ ${webcam.gif_counts.hourly} Hourly</span>` : ''}
                            ${webcam.gif_counts.full_day > 0 ? `<span class="gif-type">🌞 ${webcam.gif_counts.full_day} Full Day</span>` : ''}
                            ${webcam.gif_counts.on_demand > 0 ? `<span class="gif-type">🎯 ${webcam.gif_counts.on_demand} On-Demand</span>` : ''}
                        </div>
                        <div class="card-stats">
                            <span>Last Active: ${webcam.last_active_at ? new Date(webcam.last_active_at).toLocaleDateString() : 'Unknown'}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderGifs(webcamId, webcamName, gifs) {
        const content = document.getElementById('content');
        const breadcrumb = document.getElementById('breadcrumb');

        // Store current GIFs for modal navigation
        this.currentGifs = gifs;

        breadcrumb.style.display = 'block';
        breadcrumb.innerHTML = `
            <a href="#" onclick="app.navigateToParks()">🏠 Home</a> >
            <a href="#" onclick="app.navigateToWebcams('${this.currentPark}')">${this.currentPark}</a> >
            📹 ${webcamName}
        `;

        content.innerHTML = `
            <h2 style="color: white; margin-bottom: 20px; text-align: center;">${webcamName} - GIF Gallery</h2>

            <div class="filters">
                <div class="filter-buttons">
                    <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" onclick="app.setFilter('all')">All Types</button>
                    <button class="filter-btn ${this.currentFilter === 'sunrise' ? 'active' : ''}" onclick="app.setFilter('sunrise')">🌅 Sunrise</button>
                    <button class="filter-btn ${this.currentFilter === 'sunset' ? 'active' : ''}" onclick="app.setFilter('sunset')">🌇 Sunset</button>
                    <button class="filter-btn ${this.currentFilter === 'hourly' ? 'active' : ''}" onclick="app.setFilter('hourly')">⏰ Hourly</button>
                    <button class="filter-btn ${this.currentFilter === 'full_day' ? 'active' : ''}" onclick="app.setFilter('full_day')">🌞 Full Day</button>
                    <button class="filter-btn ${this.currentFilter === 'on_demand' ? 'active' : ''}" onclick="app.setFilter('on_demand')">🎯 On-Demand</button>
                </div>
            </div>

            <div class="gif-grid">
                ${gifs.length > 0 ? gifs.map((gif, index) => `
                    <div class="gif-card" onclick="app.openModal(${index})" style="cursor: pointer;">
                        <div class="gif-preview">
                            ${this.getGifTypeEmoji(gif.gif_type)}
                        </div>
                        <div class="gif-info">
                            <span class="gif-type-badge ${gif.gif_type}">${this.getGifTypeLabel(gif.gif_type)}</span>
                            <div style="font-size: 0.9rem; color: #666; margin-bottom: 5px;">
                                ${gif.date_key}
                            </div>
                        </div>
                    </div>
                `).join('') : '<div style="color: white; text-align: center; grid-column: 1/-1;">No GIFs found for this filter</div>'}
            </div>
        `;
    }

    getGifTypeEmoji(type) {
        const emojis = {
            sunrise: '🌅',
            sunset: '🌇',
            hourly: '⏰',
            full_day: '🌞',
            on_demand: '🎯'
        };
        return emojis[type] || '🎬';
    }

    getGifTypeLabel(type) {
        const labels = {
            sunrise: 'Sunrise',
            sunset: 'Sunset',
            hourly: 'Hourly',
            full_day: 'Full Day',
            on_demand: 'On-Demand'
        };
        return labels[type] || type;
    }

    navigateToParks() {
        this.currentView = 'parks';
        this.currentPark = null;
        this.currentWebcam = null;
        this.loadParks();
        history.pushState({view: 'parks'}, '', '/gallery');
    }

    navigateToWebcams(park) {
        this.currentView = 'webcams';
        this.currentPark = park;
        this.currentWebcam = null;
        this.loadWebcams(park);
        history.pushState({view: 'webcams', park}, '', `/gallery?park=${encodeURIComponent(park)}`);
    }

    navigateToGifs(webcamId, webcamName) {
        this.currentView = 'gifs';
        this.currentWebcam = {id: webcamId, name: webcamName};
        this.currentFilter = 'all';
        this.loadGifs(webcamId, webcamName);
        history.pushState({view: 'gifs', webcamId, webcamName}, '', `/gallery?webcam=${webcamId}`);
    }

    setFilter(filter) {
        this.currentFilter = filter;
        if (this.currentWebcam) {
            this.loadGifs(this.currentWebcam.id, this.currentWebcam.name);
        }
    }

    showError(message) {
        const content = document.getElementById('content');
        content.innerHTML = `<div class="error">Error: ${message}</div>`;
    }

    handleNavigation(state) {
        if (state.view === 'parks') {
            this.navigateToParks();
        } else if (state.view === 'webcams') {
            this.navigateToWebcams(state.park);
        } else if (state.view === 'gifs') {
            this.navigateToGifs(state.webcamId, state.webcamName);
        }
    }

    // Modal functionality
    openModal(gifIndex) {
        this.currentGifIndex = gifIndex;
        this.showVideo();
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
        this.modalVideo.pause();
        this.modalVideo.src = '';
        this.hideLoadingAndError();
    }

    async showVideo() {
        const gif = this.currentGifs[this.currentGifIndex];
        if (!gif) return;

        this.showLoading();
        this.updateGifInfo(gif);
        this.updateNavButtons();

        try {
            // Check if GIF has storage key
            if (!gif.gif_storage_key) {
                this.showVideoError('Video not available - no storage key');
                return;
            }

            // Check if config is loaded
            if (!this.config || !this.config.r2_public_base_url) {
                this.showVideoError('Configuration not loaded');
                return;
            }

            // Use direct R2 URL instead of proxy
            const videoUrl = `${this.config.r2_public_base_url}/${gif.gif_storage_key}`;
            this.modalVideo.src = videoUrl;

            // Wait for video to load
            await new Promise((resolve, reject) => {
                this.modalVideo.onloadeddata = resolve;
                this.modalVideo.onerror = reject;
            });

            this.hideLoadingAndError();
            this.modalVideo.play();
        } catch (error) {
            this.showVideoError('Failed to load video');
        }
    }

    showLoading() {
        const loading = document.querySelector('.video-loading');
        const error = document.querySelector('.video-error');
        loading.style.display = 'block';
        error.style.display = 'none';
        this.modalVideo.style.display = 'none';
    }

    showVideoError(message) {
        const loading = document.querySelector('.video-loading');
        const error = document.querySelector('.video-error');
        loading.style.display = 'none';
        error.style.display = 'block';
        error.querySelector('p').textContent = message;
        this.modalVideo.style.display = 'none';
    }

    hideLoadingAndError() {
        const loading = document.querySelector('.video-loading');
        const error = document.querySelector('.video-error');
        loading.style.display = 'none';
        error.style.display = 'none';
        this.modalVideo.style.display = 'block';
    }

    updateGifInfo(gif) {
        const title = document.getElementById('modal-gif-title');
        const details = document.getElementById('modal-gif-details');
        const position = document.getElementById('modal-gif-position');

        title.textContent = `${this.getGifTypeLabel(gif.gif_type)} - ${gif.webcam_display_name || gif.webcam_name}`;
        details.textContent = `${new Date(gif.created_at).toLocaleDateString()} ${new Date(gif.created_at).toLocaleTimeString()}`;
        position.textContent = `${this.currentGifIndex + 1} of ${this.currentGifs.length}`;
    }

    updateNavButtons() {
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');

        prevBtn.disabled = this.currentGifIndex === 0;
        nextBtn.disabled = this.currentGifIndex === this.currentGifs.length - 1;
    }

    previousGif() {
        if (this.currentGifIndex > 0) {
            this.currentGifIndex--;
            this.showVideo();
        }
    }

    nextGif() {
        if (this.currentGifIndex < this.currentGifs.length - 1) {
            this.currentGifIndex++;
            this.showVideo();
        }
    }
}

const app = new GalleryApp();
