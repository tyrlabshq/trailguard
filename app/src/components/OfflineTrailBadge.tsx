/**
 * OfflineTrailBadge — Shows cached data status on the map.
 *
 * Displays:
 *   - "CACHED" badge with last-updated timestamp when viewing cached trail data
 *   - "OFFLINE" badge when offline with no cached data
 *   - "Download for Offline" button when online and no cache exists
 *   - Download progress bar during download
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import type { CachedAreaMeta } from '../services/TrailDataCache';

interface Props {
  /** Whether the device is offline. */
  isOffline: boolean;
  /** Whether cached data is currently being displayed. */
  isServingCached: boolean;
  /** Metadata for the cached area, if one exists for current location. */
  cachedArea: CachedAreaMeta | null;
  /** Whether a download is in progress. */
  isDownloading: boolean;
  /** Download progress 0–1. */
  downloadProgress: number;
  /** Download error message, if any. */
  downloadError: string | null;
  /** Called when user taps "Download for Offline". */
  onDownload: () => void;
}

function formatCacheAge(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  if (isNaN(ms) || ms < 0) return 'just now';
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

export function OfflineTrailBadge({
  isOffline,
  isServingCached,
  cachedArea,
  isDownloading,
  downloadProgress,
  downloadError,
  onDownload,
}: Props) {
  // Downloading state
  if (isDownloading) {
    return (
      <View style={styles.container}>
        <View style={styles.downloadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.downloadingText}>
            Downloading trails... {Math.round(downloadProgress * 100)}%
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${downloadProgress * 100}%` }]} />
        </View>
      </View>
    );
  }

  // Download error
  if (downloadError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Download failed: {downloadError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onDownload}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Serving cached data (offline fallback active)
  if (isServingCached && cachedArea) {
    return (
      <View style={[styles.container, styles.cachedContainer]}>
        <View style={styles.badgeRow}>
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>OFFLINE</Text>
          </View>
          <View style={styles.cachedBadge}>
            <Text style={styles.cachedBadgeText}>CACHED</Text>
          </View>
        </View>
        <Text style={styles.cacheInfo}>
          {cachedArea.segmentCount} trails · {cachedArea.conditionCount} reports · Updated {formatCacheAge(cachedArea.cachedAt)}
        </Text>
      </View>
    );
  }

  // Online with cached data available
  if (cachedArea && !isOffline) {
    return (
      <View style={styles.container}>
        <View style={styles.badgeRow}>
          <View style={styles.cachedBadge}>
            <Text style={styles.cachedBadgeText}>CACHED</Text>
          </View>
          <Text style={styles.cacheAge}>Updated {formatCacheAge(cachedArea.cachedAt)}</Text>
        </View>
      </View>
    );
  }

  // Offline with NO cached data
  if (isOffline && !cachedArea) {
    return (
      <View style={[styles.container, styles.noCacheContainer]}>
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineBadgeText}>OFFLINE</Text>
        </View>
        <Text style={styles.noCacheText}>No cached trail data for this area</Text>
      </View>
    );
  }

  // Online with no cache — show download button
  if (!cachedArea && !isOffline) {
    return (
      <TouchableOpacity style={[styles.container, styles.downloadContainer]} onPress={onDownload}>
        <Text style={styles.downloadText}>Save Trails Offline</Text>
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 120,
    left: 12,
    backgroundColor: 'rgba(8,12,20,0.9)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxWidth: 220,
  },
  cachedContainer: {
    borderColor: 'rgba(0,200,232,0.3)',
  },
  noCacheContainer: {
    borderColor: 'rgba(255,59,59,0.3)',
  },
  downloadContainer: {
    borderColor: 'rgba(0,200,232,0.3)',
    backgroundColor: 'rgba(0,200,232,0.12)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cachedBadge: {
    backgroundColor: 'rgba(0,200,232,0.2)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cachedBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  offlineBadge: {
    backgroundColor: 'rgba(255,59,59,0.2)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  offlineBadgeText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cacheAge: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  cacheInfo: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  noCacheText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  downloadText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  downloadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadingText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  errorText: {
    color: colors.danger,
    fontSize: 11,
  },
  retryBtn: {
    marginTop: 4,
  },
  retryBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
