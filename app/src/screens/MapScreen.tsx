import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { colors } from '../theme/colors';
import { useGroupWebSocket, type MemberLocation } from '../hooks/useGroupWebSocket';
import { MemberPin } from '../components/MemberPin';
import { MemberListPanel } from '../components/MemberListPanel';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRelativeTime(timestamp: string): string {
  const ms = Date.now() - new Date(timestamp).getTime();
  if (isNaN(ms) || ms < 0) return 'just now';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function getBatteryColor(battery: number): string {
  if (battery > 50) return colors.success;
  if (battery > 20) return '#ffaa00';
  return colors.danger;
}

// ---------------------------------------------------------------------------
// Reconnecting banner
// ---------------------------------------------------------------------------

function ReconnectingBanner() {
  return (
    <View style={styles.reconnectBanner}>
      <Text style={styles.reconnectText}>⚠ Reconnecting…</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Member detail bottom sheet
// ---------------------------------------------------------------------------

interface MemberDetailSheetProps {
  member: MemberLocation;
  onClose: () => void;
}

function MemberDetailSheet({ member, onClose }: MemberDetailSheetProps) {
  return (
    <View style={styles.detailSheet}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetName}>{member.userId}</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.sheetClose}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sheetRow}>
        <Text style={styles.sheetLabel}>Speed</Text>
        <Text style={styles.sheetValue}>{Math.round(member.speed)} mph</Text>
      </View>

      <View style={styles.sheetRow}>
        <Text style={styles.sheetLabel}>Battery</Text>
        <Text style={[styles.sheetValue, { color: getBatteryColor(member.battery) }]}>
          {member.battery}%
        </Text>
      </View>

      <View style={styles.sheetRow}>
        <Text style={styles.sheetLabel}>Last Seen</Text>
        <Text style={styles.sheetValue}>{getRelativeTime(member.timestamp)}</Text>
      </View>

      <View style={styles.sheetRow}>
        <Text style={styles.sheetLabel}>Location</Text>
        <Text style={styles.sheetValue}>
          {member.lat.toFixed(5)}, {member.lng.toFixed(5)}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const DEFAULT_CENTER: [number, number] = [-84.9573, 46.3539];

export default function MapScreen() {
  const { members, connected } = useGroupWebSocket();

  const [selectedMember, setSelectedMember] = useState<MemberLocation | null>(null);
  const [panelVisible, setPanelVisible] = useState(false);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);

  const cameraRef = useRef<MapboxGL.Camera>(null);

  // Convert Map to array for rendering
  const memberList = Array.from(members.values());

  const handleMemberPress = useCallback((member: MemberLocation) => {
    setPanelVisible(false);
    setSelectedMember(member);
  }, []);

  const handleMapPress = useCallback(() => {
    setSelectedMember(null);
  }, []);

  const handleCenterOnMe = useCallback(() => {
    if (!cameraRef.current) return;
    const center = userCoords ?? DEFAULT_CENTER;
    cameraRef.current.setCamera({
      centerCoordinate: center,
      zoomLevel: 14,
      animationDuration: 600,
    });
  }, [userCoords]);

  const handleUserLocationUpdate = useCallback(
    (location: MapboxGL.Location) => {
      const { longitude, latitude } = location.coords;
      setUserCoords([longitude, latitude]);
    },
    [],
  );

  return (
    <View style={styles.container}>
      {/* ---------------------------------------------------------------- */}
      {/* Map                                                               */}
      {/* ---------------------------------------------------------------- */}
      <MapboxGL.MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/outdoors-v12"
        onPress={handleMapPress}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={12}
          centerCoordinate={DEFAULT_CENTER}
          animationMode="flyTo"
        />

        <MapboxGL.UserLocation
          visible
          onUpdate={handleUserLocationUpdate}
        />

        {/* Group member pins */}
        {memberList.map((member) => (
          <MapboxGL.MarkerView
            key={member.userId}
            coordinate={[member.lng, member.lat]}
          >
            <MemberPin member={member} onPress={handleMemberPress} />
          </MapboxGL.MarkerView>
        ))}
      </MapboxGL.MapView>

      {/* ---------------------------------------------------------------- */}
      {/* Offline / reconnecting banner                                     */}
      {/* ---------------------------------------------------------------- */}
      {!connected && <ReconnectingBanner />}

      {/* ---------------------------------------------------------------- */}
      {/* HUD — top right                                                   */}
      {/* ---------------------------------------------------------------- */}
      <View style={styles.hud}>
        <Text style={[styles.hudText, { color: connected ? colors.success : colors.danger }]}>
          {connected ? '● LIVE' : '● OFFLINE'}
        </Text>
        <Text style={styles.hudText}>👥 {memberList.length}</Text>
      </View>

      {/* ---------------------------------------------------------------- */}
      {/* Center on me — bottom right                                       */}
      {/* ---------------------------------------------------------------- */}
      <TouchableOpacity style={styles.centerBtn} onPress={handleCenterOnMe}>
        <Text style={styles.centerBtnText}>⊙</Text>
      </TouchableOpacity>

      {/* ---------------------------------------------------------------- */}
      {/* Members list toggle — above center button                        */}
      {/* ---------------------------------------------------------------- */}
      <TouchableOpacity
        style={[styles.groupBtn, panelVisible && styles.groupBtnActive]}
        onPress={() => {
          setSelectedMember(null);
          setPanelVisible((v) => !v);
        }}
      >
        <Text style={styles.groupBtnText}>👥 Group</Text>
      </TouchableOpacity>

      {/* ---------------------------------------------------------------- */}
      {/* Member detail sheet (tap on pin)                                  */}
      {/* ---------------------------------------------------------------- */}
      {selectedMember && !panelVisible && (
        <MemberDetailSheet
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Slide-up members list panel                                       */}
      {/* ---------------------------------------------------------------- */}
      <MemberListPanel
        visible={panelVisible}
        members={memberList}
        onClose={() => setPanelVisible(false)}
        onMemberPress={(member) => {
          setPanelVisible(false);
          setSelectedMember(member);
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const { width: _SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },

  // Reconnecting banner
  reconnectBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,170,0,0.92)',
    paddingVertical: 10,
    alignItems: 'center',
    zIndex: 20,
  },
  reconnectText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },

  // HUD
  hud: {
    position: 'absolute',
    top: 60,
    right: 12,
    backgroundColor: 'rgba(8,12,20,0.85)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  hudText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },

  // Center on me button
  centerBtn: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  centerBtnText: {
    fontSize: 22,
    color: colors.accent,
  },

  // Group members panel toggle
  groupBtn: {
    position: 'absolute',
    bottom: 160,
    right: 16,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  groupBtnActive: {
    backgroundColor: colors.textDim,
  },
  groupBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // Member detail sheet
  detailSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  sheetClose: {
    color: colors.textDim,
    fontSize: 20,
    padding: 4,
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sheetLabel: {
    color: colors.textDim,
    fontSize: 14,
  },
  sheetValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
