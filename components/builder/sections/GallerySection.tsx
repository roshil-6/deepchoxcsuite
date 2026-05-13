'use client';

import React, { useState } from 'react';
import type { GalleryComponent, UITheme } from '@/lib/uiSchema';
import { sanitizeMediaUrl } from '@/lib/builderSafety';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface GallerySectionProps {
  component: GalleryComponent;
  theme: UITheme;
}

export function GallerySection({ component, theme }: GallerySectionProps) {
  const { title, description, layout, images } = component;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const lbSrc =
    lightboxOpen && images.length ? sanitizeMediaUrl(images[currentIndex]?.src ?? '') : '';

  const getGridClasses = () => {
    switch (layout) {
      case 'masonry':
        return 'columns-1 sm:columns-2 lg:columns-3 gap-4';
      case 'carousel':
        return 'flex overflow-x-auto gap-4 pb-4 snap-x';
      case 'grid':
      default:
        return 'grid grid-cols-2 lg:grid-cols-3 gap-4';
    }
  };

  return (
    <section className="w-full py-16 lg:py-24" style={{ background: theme.surface }}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {(title || description) && (
          <div className="text-center mb-12">
            {title && (
              <h2 className="text-3xl font-bold mb-4" style={{ color: theme.text }}>
                {title}
              </h2>
            )}
            {description && (
              <p className="text-lg max-w-2xl mx-auto" style={{ color: theme.textMuted }}>
                {description}
              </p>
            )}
          </div>
        )}

        <div className={getGridClasses()}>
          {images.map((image, index) => (
            <GalleryImage
              key={image.id || index}
              image={image}
              theme={theme}
              layout={layout}
              onClick={() => openLightbox(index)}
            />
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full"
            style={{ color: '#fff', background: 'rgba(255,255,255,0.1)' }}
            onClick={closeLightbox}
          >
            <X size={24} />
          </button>

          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full"
            style={{ color: '#fff', background: 'rgba(255,255,255,0.1)' }}
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
          >
            <ChevronLeft size={32} />
          </button>

          {lbSrc && (
          <img
            src={lbSrc}
            alt={images[currentIndex]?.alt}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          )}

          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full"
            style={{ color: '#fff', background: 'rgba(255,255,255,0.1)' }}
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
          >
            <ChevronRight size={32} />
          </button>

          {images[currentIndex]?.caption && (
            <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
              {images[currentIndex].caption}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function GalleryImage({
  image,
  theme,
  layout,
  onClick,
}: {
  image: { src: string; alt: string; caption?: string };
  theme: UITheme;
  layout: string;
  onClick: () => void;
}) {
  const thumbSrc = sanitizeMediaUrl(image.src || '');
  const isMasonry = layout === 'masonry';
  const isCarousel = layout === 'carousel';

  if (!thumbSrc) return null;

  return (
    <div
      className={`${isCarousel ? 'flex-shrink-0 w-72 snap-start' : ''} ${isMasonry ? 'mb-4 break-inside-avoid' : ''} group cursor-pointer`}
      onClick={onClick}
    >
      <div
        className="overflow-hidden"
        style={{ borderRadius: getBorderRadius(theme.borderRadius) }}
      >
        <img
          src={thumbSrc}
          alt={image.alt}
          className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      {image.caption && (
        <p className="text-sm mt-2 text-center" style={{ color: theme.textMuted }}>
          {image.caption}
        </p>
      )}
    </div>
  );
}

function getBorderRadius(radius: string): string {
  const map: Record<string, string> = {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '24px',
  };
  return map[radius] || '12px';
}
