import {
  computeSectionProps,
  SECTION_PRESETS,
  type SectionKind,
  type SectionParams,
} from '../lib/crossSections';
import { MATERIALS } from '../lib/materials';
import { GlossaryTooltip } from './GlossaryTooltip';

interface SectionEditorProps {
  section: SectionParams;
  materialId: string;
  onSectionChange: (s: SectionParams) => void;
  onMaterialChange: (id: string) => void;
}

export function SectionEditor({
  section,
  materialId,
  onSectionChange,
  onMaterialChange,
}: SectionEditorProps) {
  const props = computeSectionProps(section);

  const setKind = (kind: SectionKind) => {
    if (kind === 'solidRod') {
      onSectionChange({ kind: 'solidRod', diameter: 12 });
    } else if (kind === 'rectangle') {
      onSectionChange({ kind: 'rectangle', width: 10, height: 20 });
    } else if (kind === 'hollowTube') {
      onSectionChange({ kind: 'hollowTube', outerDiameter: 20, innerDiameter: 16 });
    } else {
      onSectionChange({
        kind: 'iBeam',
        height: 40,
        flangeWidth: 20,
        flangeThickness: 3,
        webThickness: 2,
      });
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-surface-700 bg-surface-800/40 px-3 py-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
        Cross-Section & Material
      </h3>

      <label className="block space-y-1">
        <span className="text-xs text-surface-300">Member material</span>
        <select
          value={materialId}
          onChange={(e) => onMaterialChange(e.target.value)}
          className="w-full rounded-lg border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-surface-100"
        >
          {MATERIALS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-surface-300">Section type</span>
        <select
          value={section.kind}
          onChange={(e) => setKind(e.target.value as SectionKind)}
          className="w-full rounded-lg border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-surface-100"
        >
          <option value="rectangle">Rectangular stick</option>
          <option value="solidRod">Solid Circular Rod</option>
          <option value="hollowTube">Hollow Tube</option>
          <option value="iBeam">Structural I-Beam</option>
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-surface-300">Presets</span>
        <select
          defaultValue=""
          onChange={(e) => {
            const p = SECTION_PRESETS.find((x) => x.id === e.target.value);
            if (p) onSectionChange(p.section);
          }}
          className="w-full rounded-lg border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-surface-100"
        >
          <option value="" disabled>
            Apply preset…
          </option>
          {SECTION_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      {section.kind === 'rectangle' && <><Num label="Width (mm)" value={section.width} onChange={width => onSectionChange({ ...section, width })} /><Num label="Height (mm)" value={section.height} onChange={height => onSectionChange({ ...section, height })} /></>}
      {section.kind === 'solidRod' && (
        <Num
          label="Diameter (mm)"
          value={section.diameter}
          onChange={(diameter) => onSectionChange({ ...section, diameter })}
        />
      )}
      {section.kind === 'hollowTube' && (
        <>
          <Num
            label="Outer Ø (mm)"
            value={section.outerDiameter}
            onChange={(outerDiameter) => onSectionChange({ ...section, outerDiameter })}
          />
          <Num
            label="Inner Ø (mm)"
            value={section.innerDiameter}
            onChange={(innerDiameter) => onSectionChange({ ...section, innerDiameter })}
          />
        </>
      )}
      {section.kind === 'iBeam' && (
        <>
          <Num
            label="Height (mm)"
            value={section.height}
            onChange={(height) => onSectionChange({ ...section, height })}
          />
          <Num
            label="Flange width (mm)"
            value={section.flangeWidth}
            onChange={(flangeWidth) => onSectionChange({ ...section, flangeWidth })}
          />
          <Num
            label="Flange thick (mm)"
            value={section.flangeThickness}
            onChange={(flangeThickness) => onSectionChange({ ...section, flangeThickness })}
          />
          <Num
            label="Web thick (mm)"
            value={section.webThickness}
            onChange={(webThickness) => onSectionChange({ ...section, webThickness })}
          />
        </>
      )}

      <div className="rounded-md bg-surface-900/80 px-2.5 py-2 font-mono text-[10px] text-surface-400">
        <div>
          A = {props.area.toFixed(1)} mm² · I = {props.I.toFixed(0)} mm⁴
        </div>
        <div className="mt-1 text-surface-500">{props.label}</div>
        <div className="mt-1.5 font-sans text-[10px] text-surface-400">
          Feeds <GlossaryTooltip term="Euler Buckling" />. Material checks use the weakest axis.
        </div>
      </div>
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-surface-300">
      <span>{label}</span>
      <input
        type="number"
        min={0.1}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 rounded-md border border-surface-700 bg-surface-800 px-2 py-1 font-mono text-xs text-surface-100"
      />
    </label>
  );
}
