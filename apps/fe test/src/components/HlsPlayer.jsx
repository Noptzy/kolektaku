import React, { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

class ProxyLoader extends Hls.DefaultConfig.loader {
    constructor(config) {
        super(config);
        const load = this.load.bind(this);
        this.load = (context, config, callbacks) => {
            const originalUrl = context.url;
            const proxyUrl = `http://localhost:3002/proxy?url=${encodeURIComponent(originalUrl)}`;
            const newContext = { ...context, url: proxyUrl };
            const newCallbacks = {
                ...callbacks,
                onSuccess: (response, stats, ctx) => {
                    response.url = originalUrl;
                    if (ctx) ctx.url = originalUrl;
                    callbacks.onSuccess(response, stats, ctx);
                },
                onError: callbacks.onError,
                onTimeout: callbacks.onTimeout,
                onProgress: callbacks.onProgress
            };
            load(newContext, config, newCallbacks);
        };
    }
}

const HlsPlayer = ({ src, headers, tracks = [], intro, outro, onTimeUpdate: onTimeUpdateProp, waitingForTranslation = false }) => {
    const artRef = useRef(null);
    const containerRef = useRef(null);
    const subtitleSettingAddedRef = useRef(false);

    useEffect(() => {
        let hls;

        const art = new Artplayer({
            container: containerRef.current,
            url: src,
            customType: {
                m3u8: function (video, url, art) {
                    if (Hls.isSupported()) {
                        if (hls) hls.destroy();
                        hls = new Hls({ loader: ProxyLoader });
                        hls.loadSource(url);
                        hls.attachMedia(video);
                        art.hls = hls; // Save to art for later access

                        hls.on(Hls.Events.MANIFEST_PARSED, () => {
                            // Setup Quality settings
                            const quality = hls.levels.map((level, index) => ({
                                default: index === hls.levels.length - 1,
                                html: level.height + 'P',
                                level: index,
                            }));
                            quality.unshift({
                                default: true,
                                html: 'Auto',
                                level: -1
                            });

                            art.setting.add({ // Use add for initial setting setup
                                name: 'Quality',
                                tooltip: 'Auto',
                                html: 'Quality',
                                selector: quality,
                                onSelect: function (item) {
                                    hls.currentLevel = item.level;
                                    return item.html;
                                }
                            });

                        });

                        art.on('destroy', () => hls.destroy());
                    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                        video.src = url;
                    } else {
                        art.notice.show = 'Unsupported playback format: hls';
                    }
                }
            },
            type: 'm3u8',
            setting: true,
            playbackRate: true,
            aspectRatio: true,
            fullscreen: true,
            fullscreenWeb: true,
            miniProgressBar: true,
            fastForward: true,
            autoSize: true,
            autoplay: false, // Don't autoplay immediately if waiting for translation
            subtitle: {
                url: '', // Default off, will be updated via tracks
                type: 'vtt',
                style: {
                    color: '#ffffff',
                    fontSize: '28px', // Increased size
                    textShadow: '0 1px 3px rgba(0, 0, 0, 0.8), 0 1px 8px rgba(0, 0, 0, 0.6)', // Better, cleaner text shadow
                    backgroundColor: 'transparent', // Use transparent background for cleaner look
                    fontFamily: '"Inter", "Roboto", "Segoe UI", sans-serif',
                    fontWeight: '600',
                    lineHeight: '1.2'
                },
                encoding: 'utf-8',
            },
            controls: [
                {
                    name: 'intro-outro',
                    position: 'right',
                    html: '',
                }
            ]
        });

        artRef.current = art;

        art.on('video:timeupdate', () => {
            const time = art.currentTime;
            if (onTimeUpdateProp) onTimeUpdateProp(time);

            if (intro && time >= intro.start && time <= intro.end) {
                art.controls.update({
                    name: 'intro-outro',
                    html: `<button class="art-control-button" style="padding:4px 8px;border-radius:4px;background:rgba(255,255,255,0.2);color:#fff;border:none;cursor:pointer;">Skip Intro <i class="fas fa-step-forward"></i></button>`,
                    click: function () {
                        art.currentTime = intro.end;
                    }
                });
            } else if (outro && time >= outro.start && time <= outro.end) {
                art.controls.update({
                    name: 'intro-outro',
                    html: `<button class="art-control-button" style="padding:4px 8px;border-radius:4px;background:rgba(255,255,255,0.2);color:#fff;border:none;cursor:pointer;">Next Episode <i class="fas fa-forward"></i></button>`,
                    click: function () {
                        art.currentTime = art.duration;
                    }
                });
            } else {
                art.controls.update({
                    name: 'intro-outro',
                    html: ''
                });
            }
        });

        return () => {
            if (art && art.destroy) {
                art.destroy(false);
            }
        };
    }, [src, intro, outro]);

    useEffect(() => {
        if (!artRef.current) return;
        const art = artRef.current;

        let subSelectors = tracks.map((track, i) => ({
            default: track.default || false,
            html: track.label || `Track ${i + 1}`,
            url: track.file
        }));

        const hasDefault = subSelectors.some(s => s.default);
        subSelectors.unshift({
            default: !hasDefault,
            html: 'Off',
            url: ''
        });

        const currentSub = subSelectors.find(s => s.default);
        if (currentSub && currentSub.url) {
            art.subtitle.url = currentSub.url;
            art.subtitle.show = true;
        } else {
            art.subtitle.show = false;
        }

        const settingConfig = {
            name: 'Subtitle',
            tooltip: currentSub ? currentSub.html : 'Off',
            html: 'Subtitle',
            selector: subSelectors,
            onSelect: function (item) {
                if (item.url) {
                    art.subtitle.switch(item.url, { name: item.html });
                    art.subtitle.show = true;
                } else {
                    art.subtitle.show = false;
                }
                return item.html;
            }
        };

        if (subtitleSettingAddedRef.current) {
            art.setting.update(settingConfig);
        } else {
            art.setting.add(settingConfig);
            subtitleSettingAddedRef.current = true;
        }

    }, [tracks]);

    useEffect(() => {
        if (!artRef.current) return;
        if (waitingForTranslation) {
            artRef.current.pause();
        } else {
            // Attempt to autoplay if not playing
            if (!artRef.current.playing) {
                artRef.current.play().catch(() => { });
            }
        }
    }, [waitingForTranslation]);

    return (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden' }} />

            {waitingForTranslation && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 999,
                    borderRadius: '8px 8px 0 0',
                    gap: '12px',
                    pointerEvents: 'none',
                }}>
                    <div style={{
                        width: '40px', height: '40px',
                        border: '3px solid rgba(255,255,255,0.2)',
                        borderTop: '3px solid #00bcd4',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <span style={{ color: '#fff', fontSize: '14px', opacity: 0.9 }}>
                        Menerjemahkan subtitle...
                    </span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}
        </div>
    );
};

export default HlsPlayer;
