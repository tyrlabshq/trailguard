import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Switch,
  Vibration,
  Alert,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { colors } from '../theme/colors';
import { useGroupWebSocket, type MemberLocation } from '../hooks/useGroupWebSocket';
import { MemberPin } from '../components/MemberPin';
import { MemberListPanel } from '../components/MemberListPanel';
import { getAvalancheGeoJSON, type AvalancheGeoJSON, cacheAge } from '../services/avalanche';
import { fetchPOIs, type POI, POI_COLORS, POI_ICONS } from '../services/poi';
import { autoDownloadAroundLocation } from '../services/offlineMaps';

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
// Trail condition severity → color (crowdsourced dots)
// ---------------------------------------------------------------------------
type ConditionSeverity = 'excellent' | 'good' | 'fair' | 'poor' | 'closed';
const CONDITION_COLORS: Record<ConditionSeverity, string> = {
  excellent: '#00ff88',
  good: '#88ff00',
  fair: '#ffdd00',
  poor: '#ff8800',
  closed: '#ff2200',
};

// Stub: real app pulls from backend API
interface ConditionReport {
  id: string;
  lat: number;
  lng: number;
  severity: ConditionSeverity;
  note?: string;
}

const STUB_REPORTS: ConditionReport[] = [
  { id: '1', lat: 46.41, lng: -84.85, severity: 'excellent', note: 'Perfect powder' },
  { id: '2', lat: 46.52, lng: -84.70, severity: 'good', note: 'Some ice patches' },
  { id: '3', lat: 46.30, lng: -85.10, severity: 'fair', note: 'Groomed last night' },
  { id: '4', lat: 46.60, lng: -84.60, severity: 'poor', note: 'Wet snow, be careful' },
];

// ---------------------------------------------------------------------------
// Map layers
// ---------------------------------------------------------------------------

/**
 * Snowmobile trail layer from TOPORAMA / OpenSnowMobile tileset.
 * Falls back to Mapbox Terrain for offline if no custom tileset configured.
 * For production, replace TRAIL_TILESET_ID with a real Mapbox-hosted tileset.
 */
const TRAIL_TILESET_ID = 'mapbox.mapbox-terrain-v2'; // placeholder — real tileset goes here
const TRAIL_LAYER_ID = 'snowmobile-trails';

function TrailLayer() {
  return (
    <>
      <MapboxGL.VectorSource
        id="trail-source"
        url={`mapbox://${TRAIL_TILESET_ID}`}
      >
        {/* Trail lines */}
        <MapboxGL.LineLayer
          id={TRAIL_LAYER_ID}
          sourceLayerID="contour" // real tileset: use the actual layer name
          style={{
            lineColor: '#00aaff',
            lineWidth: [
              'interpolate', ['linear'], ['zoom'],
              8, 1,
              12, 2.5,
              15, 4,
            ],
            lineOpacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </MapboxGL.VectorSource>
    </>
  );
}

// ---------------------------------------------------------------------------
// Avalanche overlay
// ---------------------------------------------------------------------------

interface AvalancheLayerProps {
  data: AvalancheGeoJSON;
}

function AvalancheLayer({ data }: AvalancheLayerProps) {
  // Build color expression from feature properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fillColorExpression: any = [
    'case',
    ['==', ['get', 'danger'], 'Low'], '#00cc44',
    ['==', ['get', 'danger'], 'Moderate'], '#ffdd00',
    ['==', ['get', 'danger'], 'Considerable'], '#ff8800',
    ['==', ['get', 'danger'], 'High'], '#ff2200',
    ['==', ['get', 'danger'], 'Extreme'], '#1a1a1a',
    '#444466', // Unknown fallback
  ];

  return (
    <MapboxGL.ShapeSource id="avalanche-source" shape={data as any}>
      <MapboxGL.FillLayer
        id="avalanche-fill"
        style={{
          fillColor: fillColorExpression,
          fillOpacity: 0.32,
        }}
      />
      <MapboxGL.LineLayer
        id="avalanche-outline"
        style={{
          lineColor: fillColorExpression,
          lineWidth: 1.5,
          lineOpacity: 0.7,
        }}
      />
    </MapboxGL.ShapeSource>
  );
}

// ---------------------------------------------------------------------------
// POI markers
// ---------------------------------------------------------------------------

interface POILayerProps {
  pois: POI[];
}

function POILayer({ pois }: POILayerProps) {
  if (pois.length === 0) return null;

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: pois.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { id: p.id, type: p.type, name: p.name, icon: p.icon },
    })),
  };

  return (
    <MapboxGL.ShapeSource id="poi-source" shape={geojson} cluster={false}>
      <MapboxGL.CircleLayer
        id="poi-circles"
        style={{
          circleRadius: 8,
          circleColor: [
            'match',
            ['get', 'type'],
            'fuel', POI_COLORS.fuel,
            'parking', POI_COLORS.parking,
            'warming_hut', POI_COLORS.warming_hut,
            '#888888',
          ],
          circleStrokeColor: '#fff',
          circleStrokeWidth: 1.5,
          circleOpacity: 0.92,
        }}
      />
    </MapboxGL.ShapeSource>
  );
}

// ---------------------------------------------------------------------------
// Condition report dots
// ---------------------------------------------------------------------------

interface ConditionLayerProps {
  reports: ConditionReport[];
}

function ConditionLayer({ reports }: ConditionLayerProps) {
  if (reports.length === 0) return null;

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: reports.map((r) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
      properties: { severity: r.severity, note: r.note ?? '' },
    })),
  };

  return (
    <MapboxGL.ShapeSource id="conditions-source" shape={geojson}>
      <MapboxGL.CircleLayer
        id="conditions-circles"
        style={{
          circleRadius: [
            'interpolate', ['linear'], ['zoom'],
            8, 5,
            14, 10,
          ],
          circleColor: [
            'match',
            ['get', 'severity'],
            'excellent', CONDITION_COLORS.excellent,
            'good', CONDITION_COLORS.good,
            'fair', CONDITION_COLORS.fair,
            'poor', CONDITION_COLORS.poor,
            'closed', CONDITION_COLORS.closed,
            '#888888',
          ],
          circleOpacity: 0.9,
          circleStrokeColor: 'rgba(0,0,0,0.5)',
          circleStrokeWidth: 1,
        }}
      />
    </MapboxGL.ShapeSource>
  );
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
// Layer toggle panel
// ---------------------------------------------------------------------------

interface LayerTogglesProps {
  showTrails: boolean;
  showAvalanche: boolean;
  showPOI: boolean;
  showConditions: boolean;
  onTrails: (v: boolean) => void;
  onAvalanche: (v: boolean) => void;
  onPOI: (v: boolean) => void;
  onConditions: (v: boolean) => void;
}

function LayerToggles({
  showTrails, showAvalanche, showPOI, showConditions,
  onTrails, onAvalanche, onPOI, onConditions,
}: LayerTogglesProps) {
  return (
    <View style={styles.layerPanel}>
      <LayerRow label="🛷 Trails" value={showTrails} onChange={onTrails} />
      <LayerRow label="⛰ Avalanche" value={showAvalanche} onChange={onAvalanche} />
      <LayerRow label="📍 POI" value={showPOI} onChange={onPOI} />
      <LayerRow label="● Conditions" value={showConditions} onChange={onConditions} />
    </View>
  );
}

function LayerRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.layerRow}>
      <Text style={styles.layerLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.textDim }}
        thumbColor="#fff"
        ios_backgroundColor={colors.textDim}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const DEFAULT_CENTER: [number, number] = [-84.9573, 46.3539];
// Dark terrain style with trail-friendly contrast
const MAP_STYLE_URL = 'mapbox://styles/mapbox/dark-v11';

export default function MapScreen() {
  const {
    members,
    connected,
    cmoStates,
    sweepGap,
    cmoWarning,
    dismissCmoWarning,
    sweepLeaderAlert,
    dismissSweepLeaderAlert,
  } = useGroupWebSocket();

  const [selectedMember, setSelectedMember] = useState<MemberLocation | null>(null);
  const [panelVisible, setPanelVisible] = useState(false);
  const [layerPanelVisible, setLayerPanelVisible] = useState(false);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);

  // Layer data
  const [avalancheData, setAvalancheData] = useState<AvalancheGeoJSON | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [conditionReports] = useState<ConditionReport[]>(STUB_REPORTS);

  // Layer visibility
  const [showTrails, setShowTrails] = useState(true);
  const [showAvalanche, setShowAvalanche] = useState(true);
  const [showPOI, setShowPOI] = useState(true);
  const [showConditions, setShowConditions] = useState(true);

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const autoDownloadDone = useRef(false);

  const memberList = Array.from(members.values());

  // Load avalanche data on mount
  useEffect(() => {
    getAvalancheGeoJSON().then((data) => {
      if (data) setAvalancheData(data);
    });
  }, []);

  // Load POIs when we have a user location
  useEffect(() => {
    if (!userCoords) return;
    const [lng, lat] = userCoords;
    const delta = 0.5;
    fetchPOIs([
      [lng - delta, lat - delta],
      [lng + delta, lat + delta],
    ]).then((results) => setPois(results));
  }, [userCoords]);

  // Auto-download region around user location on WiFi
  useEffect(() => {
    if (!userCoords || autoDownloadDone.current) return;
    autoDownloadDone.current = true;
    const [lng, lat] = userCoords;
    autoDownloadAroundLocation(lat, lng, 'auto-current-location').catch(() => {});
  }, [userCoords]);

  // Vibrate on sweep gap alert
  useEffect(() => {
    if (sweepGap?.alert) {
      Vibration.vibrate([0, 200, 100, 200]);
    }
  }, [sweepGap?.alert]);

  // CMO 2-minute warning
  useEffect(() => {
    if (!cmoWarning) return;
    Alert.alert(
      '⏳ 2-Minute Warning',
      "Your count-me-out timer expires in 2 minutes. Tap \"I'm Back\" on the dashboard if you've rejoined.",
      [{ text: 'OK', onPress: dismissCmoWarning }],
    );
  }, [cmoWarning, dismissCmoWarning]);

  // Sweep leader alert
  useEffect(() => {
    if (!sweepLeaderAlert) return;
    Alert.alert('⚠️ Sweep Alert', sweepLeaderAlert, [
      { text: 'OK', onPress: dismissSweepLeaderAlert },
    ]);
  }, [sweepLeaderAlert, dismissSweepLeaderAlert]);

  const handleMemberPress = useCallback((member: MemberLocation) => {
    setPanelVisible(false);
    setSelectedMember(member);
  }, []);

  const handleMapPress = useCallback(() => {
    setSelectedMember(null);
    setLayerPanelVisible(false);
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
        styleURL={MAP_STYLE_URL}
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

        {/* Snowmobile trail layer */}
        {showTrails && <TrailLayer />}

        {/* Avalanche danger zones */}
        {showAvalanche && avalancheData && <AvalancheLayer data={avalancheData} />}

        {/* Points of interest */}
        {showPOI && <POILayer pois={pois} />}

        {/* Trail condition reports */}
        {showConditions && <ConditionLayer reports={conditionReports} />}

        {/* Group member pins */}
        {memberList.map((member) => (
          <MapboxGL.MarkerView
            key={member.userId}
            coordinate={[member.lng, member.lat]}
          >
            <MemberPin
              member={member}
              onPress={handleMemberPress}
              cmoState={cmoStates.get(member.userId) ?? null}
            />
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
        {avalancheData && (
          <Text style={styles.hudTextSm}>⛰ {cacheAge(avalancheData)}</Text>
        )}
      </View>

      {/* ---------------------------------------------------------------- */}
      {/* Sweep Gap HUD — bottom left                                      */}
      {/* ---------------------------------------------------------------- */}
      {sweepGap != null && (
        <View style={[styles.sweepHud, sweepGap.alert && styles.sweepHudAlert]}>
          <Text style={styles.sweepHudLabel}>LAST RIDER</Text>
          <Text style={styles.sweepHudValue}>
            {sweepGap.distanceMiles < 0.1
              ? `${Math.round(sweepGap.distanceMiles * 5280)}ft`
              : `${sweepGap.distanceMiles.toFixed(1)}mi`}
            {' '}AHEAD
          </Text>
          {sweepGap.alert && (
            <Text style={styles.sweepHudAlertText}>⚠ TOO FAR</Text>
          )}
        </View>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Layer toggle button — top left                                   */}
      {/* ---------------------------------------------------------------- */}
      <TouchableOpacity
        style={styles.layerBtn}
        onPress={() => {
          setLayerPanelVisible((v) => !v);
          setSelectedMember(null);
          setPanelVisible(false);
        }}
      >
        <Text style={styles.layerBtnText}>🗺 Layers</Text>
      </TouchableOpacity>

      {/* ---------------------------------------------------------------- */}
      {/* Layer toggles panel                                               */}
      {/* ---------------------------------------------------------------- */}
      {layerPanelVisible && (
        <LayerToggles
          showTrails={showTrails}
          showAvalanche={showAvalanche}
          showPOI={showPOI}
          showConditions={showConditions}
          onTrails={setShowTrails}
          onAvalanche={setShowAvalanche}
          onPOI={setShowPOI}
          onConditions={setShowConditions}
        />
      )}

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
          setLayerPanelVisible(false);
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
  hudTextSm: {
    color: colors.textDim,
    fontSize: 11,
  },

  // Layer button
  layerBtn: {
    position: 'absolute',
    top: 60,
    left: 12,
    backgroundColor: 'rgba(8,12,20,0.85)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  layerBtnText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },

  // Layer panel
  layerPanel: {
    position: 'absolute',
    top: 110,
    left: 12,
    backgroundColor: 'rgba(13,21,32,0.96)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 170,
    zIndex: 10,
  },
  layerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  layerLabel: {
    color: colors.text,
    fontSize: 13,
    marginRight: 12,
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

  // Sweep gap HUD
  sweepHud: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    backgroundColor: 'rgba(8,12,20,0.90)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sweepHudAlert: {
    borderColor: '#ff3355',
    backgroundColor: 'rgba(255,51,85,0.15)',
  },
  sweepHudLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sweepHudValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  sweepHudAlertText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
});
