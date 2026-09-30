import React from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import config from '@/config/perfil.json';

interface ImpressaoDigitalTabProps {
  formData: any;
  onChange: (key: string, value: any) => void;
}


const FormRow: React.FC<{
  label: string;
  children: React.ReactNode;
  alignTop?: boolean;
}> = ({ label, children, alignTop = false }) => (
  <div
    className={`flex flex-col gap-2 pt-1 sm:flex-row sm:gap-4 ${
      alignTop ? 'sm:items-start' : 'sm:items-center'
    }`}
  >
    <label
      className={`shrink-0 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[150px] sm:text-right ${
        alignTop ? 'pt-2' : ''
      }`}
    >
      {label}
    </label>
    <div className={alignTop ? 'flex-1 space-y-2' : 'flex-1'}>{children}</div>
  </div>
);

interface OptionItem {
  id: string;
  label: string;
  desc?: string;
}

const SegmentedGroup: React.FC<{
  options: OptionItem[];
  value: string;
  onChange: (id: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex w-fit flex-wrap items-center rounded-lg border border-[#333541] bg-[#1C1D24] p-1">
    {options.map((item) => {
      const isSelected = value === item.id;
      const btn = (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`cursor-pointer rounded-md px-3 py-1.5 text-[12px] font-medium transition-all select-none ${
            isSelected
              ? 'bg-[#383944] text-white shadow-sm'
              : 'text-[#8E92A2] hover:text-[#C5C9D7]'
          }`}
        >
          {item.label}
        </button>
      );

      if (item.desc) {
        return (
          <Tooltip key={item.id} content={item.desc} position="top">
            {btn}
          </Tooltip>
        );
      }
      return btn;
    })}
  </div>
);

const ShuffleInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  onShuffle: () => void;
  title: string;
  mono?: boolean;
  maxWidthClass?: string;
}> = ({
  value,
  onChange,
  onShuffle,
  title,
  mono = false,
  maxWidthClass = 'max-w-sm',
}) => (
  <div className={`flex ${maxWidthClass} items-center gap-2`}>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`flex-1 rounded border border-[#333541] bg-[#16171D] px-3 py-1.5 text-[12px] text-white focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none ${
        mono ? 'font-mono' : ''
      }`}
    />
    <button
      type="button"
      onClick={onShuffle}
      className="cursor-pointer rounded border border-[#3A3C4B] bg-[#2B2D38] p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      title={title}
    >
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
      </svg>
    </button>
  </div>
);

const NoisePill: React.FC<{
  label: string;
  desc: string;
  checked: boolean;
  onToggle: () => void;
}> = ({ label, desc, checked, onToggle }) => (
  <Tooltip content={desc} position="top">
    <div
      onClick={onToggle}
      className="group flex cursor-pointer items-center gap-2 py-1 select-none"
    >
      <div
        className={`h-4 w-8 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
          checked ? 'bg-[#00FF66] shadow-[0_0_8px_rgba(0,255,102,0.35)]' : 'bg-[#333541]'
        }`}
      >
        <div
          className={`h-3 w-3 rounded-full transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-4 bg-[#090A0F]' : 'translate-x-0 bg-white'
          }`}
        />
      </div>
      <span
        className={`text-[12.5px] transition-colors ${
          checked ? 'text-white' : 'text-[#8E92A2] group-hover:text-[#C5C9D7]'
        }`}
      >
        {label}
      </span>
    </div>
  </Tooltip>
);

export const ImpressaoDigitalTab: React.FC<ImpressaoDigitalTabProps> = ({
  formData,
  onChange,
}) => {
  const handleShuffleRenderer = () => {
    const pool = config.webglRenderersPool;
    const random = pool[Math.floor(Math.random() * pool.length)];
    onChange('webglRenderer', random);
  };

  const handleShuffleDeviceName = () => {
    onChange('deviceName', '');
  };

  const handleShuffleMacAddress = () => {
    onChange('macAddress', '');
  };

  return (
    <div className="flex-1 space-y-4 pr-1 text-[#D2D5DF]">
      {/* Título de seção com linha divisória cinza */}
      <div className="flex items-center gap-3">
        <span className="text-[12px] font-medium text-[#7E8294] select-none">
          Impressão Digital (Fingerprint)
        </span>
        <div className="h-[1px] flex-1 bg-[#2E303B]" />
      </div>

      {/* 1. WebRTC */}
      <FormRow label="WebRTC">
        <SegmentedGroup
          options={config.webrtcModes}
          value={formData.webrtcMode}
          onChange={(val) => onChange('webrtcMode', val)}
        />
      </FormRow>

      {/* 2. Fuso horário */}
      <FormRow label="Fuso horário" alignTop>
        <SegmentedGroup
          options={config.timezoneModes}
          value={formData.timezoneMode}
          onChange={(val) => onChange('timezoneMode', val)}
        />
        {formData.timezoneMode === 'custom' && (
          <div className="max-w-md">
            <select
              value={formData.customTimezone}
              onChange={(e) => onChange('customTimezone', e.target.value)}
              className="w-full rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 text-[12.5px] text-[#C4C7D5] focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none"
            >
              {config.timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </FormRow>

      {/* 3. Localização */}
      {(() => {
        const isLatInvalid = Boolean(
          formData.customLatitude &&
          (isNaN(Number(formData.customLatitude)) ||
            Number(formData.customLatitude) < -90 ||
            Number(formData.customLatitude) > 90),
        );
        const isLngInvalid = Boolean(
          formData.customLongitude &&
          (isNaN(Number(formData.customLongitude)) ||
            Number(formData.customLongitude) < -180 ||
            Number(formData.customLongitude) > 180),
        );

        return (
          <FormRow label="Localização" alignTop>
            <SegmentedGroup
              options={config.locationModes}
              value={formData.locationMode}
              onChange={(val) => onChange('locationMode', val)}
            />

            {/* Permissão de localização via radio buttons */}
            {formData.locationMode !== 'block' && (
              <div className="space-y-1.5 pt-1">
                {config.locationPermissions.map((perm) => (
                  <label
                    key={perm.id}
                    onClick={() => onChange('locationPermission', perm.id)}
                    className="flex cursor-pointer items-center gap-2 text-[12.5px] text-[#A6ABB9] select-none hover:text-[#D2D5DF]"
                  >
                    <input
                      type="radio"
                      name="locationPermission"
                      checked={formData.locationPermission === perm.id}
                      onChange={() => {}}
                      className="cursor-pointer accent-[#00FF66]"
                    />
                    <span>{perm.text}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Coordenadas customizadas com regras da imagem */}
            {formData.locationMode === 'custom' && (
              <div className="max-w-lg space-y-3.5 rounded-lg border border-[#333541] bg-[#1C1D24] p-3.5">
                <div>
                  <label className="mb-1.5 block text-[12px] text-[#A6ABB9]">
                    <span className="mr-1 font-bold text-red-500">*</span>
                    Latitude / Longitude
                  </label>
                  <div className="grid grid-cols-2 items-start gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="55"
                        value={formData.customLatitude || ''}
                        onChange={(e) =>
                          onChange('customLatitude', e.target.value)
                        }
                        className={`w-full rounded-md bg-[#16171D] px-3 py-2 text-[12.5px] text-white transition-colors focus:outline-none ${
                          isLatInvalid
                            ? 'border border-[#F87171] ring-1 ring-[#F87171]/20 focus:border-[#F87171]'
                            : 'border border-[#333541] focus:border-white/60 focus:ring-1 focus:ring-white/15'
                        }`}
                      />
                      {isLatInvalid && (
                        <span className="mt-1 block text-[11px] leading-tight text-[#F87171]">
                          A latitude deve ser de -90° a 90°.
                        </span>
                      )}
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="55666"
                        value={formData.customLongitude || ''}
                        onChange={(e) =>
                          onChange('customLongitude', e.target.value)
                        }
                        className={`w-full rounded-md bg-[#16171D] px-3 py-2 text-[12.5px] text-white transition-colors focus:outline-none ${
                          isLngInvalid
                            ? 'border border-[#F87171] ring-1 ring-[#F87171]/20 focus:border-[#F87171]'
                            : 'border border-[#333541] focus:border-white/60 focus:ring-1 focus:ring-white/15'
                        }`}
                      />
                      {isLngInvalid && (
                        <span className="mt-1 block text-[11px] leading-tight text-[#F87171]">
                          A longitude deve ser de -180° a 180°.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] text-[#A6ABB9]">
                    Precisão (m)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={formData.customAccuracy ?? 1000}
                    onChange={(e) =>
                      onChange('customAccuracy', Number(e.target.value) || 0)
                    }
                    className="w-36 rounded-md border border-[#333541] bg-[#16171D] px-3 py-2 text-[12.5px] text-white focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </FormRow>
        );
      })()}

      {/* 4. Língua */}
      <FormRow label="Língua" alignTop>
        <SegmentedGroup
          options={config.languageModes}
          value={formData.languageMode}
          onChange={(val) => onChange('languageMode', val)}
        />
        {formData.languageMode === 'custom' && (
          <div className="max-w-md">
            <select
              value={formData.customLanguage}
              onChange={(e) => onChange('customLanguage', e.target.value)}
              className="w-full rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 text-[12.5px] text-[#C4C7D5] focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none"
            >
              {config.languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </FormRow>

      {/* 5. Resolução do Ecrã */}
      <FormRow label="Resolução do Ecrã" alignTop>
        <SegmentedGroup
          options={config.screenResolutionModes}
          value={formData.screenResolutionMode}
          onChange={(val) => onChange('screenResolutionMode', val)}
        />
        {formData.screenResolutionMode === 'default' && (
          <div className="max-w-md">
            <select
              value={formData.screenResolution}
              onChange={(e) => onChange('screenResolution', e.target.value)}
              className="w-full rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 text-[12.5px] text-[#C4C7D5] focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none"
            >
              {config.screenResolutions.map((res) => (
                <option key={res} value={res}>
                  {res}
                </option>
              ))}
            </select>
          </div>
        )}
        {formData.screenResolutionMode === 'custom' && (
          <div className="flex max-w-sm items-center gap-2">
            <input
              type="text"
              placeholder="1920"
              value={formData.customScreenWidth ?? ''}
              onChange={(e) =>
                onChange('customScreenWidth', e.target.value.replace(/\D/g, ''))
              }
              className="w-24 rounded border border-[#333541] bg-[#1C1D24] px-3 py-1.5 text-center text-[12px] text-white focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none"
            />
            <span className="text-[#8E92A2]">×</span>
            <input
              type="text"
              placeholder="1080"
              value={formData.customScreenHeight ?? ''}
              onChange={(e) =>
                onChange(
                  'customScreenHeight',
                  e.target.value.replace(/\D/g, ''),
                )
              }
              className="w-24 rounded border border-[#333541] bg-[#1C1D24] px-3 py-1.5 text-center text-[12px] text-white focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none"
            />
          </div>
        )}
      </FormRow>

      {/* 6. Tipos de Letra */}
      <FormRow label="Tipos de Letra">
        <SegmentedGroup
          options={config.fontsModes}
          value={formData.fontsMode || 'default'}
          onChange={(val) => onChange('fontsMode', val)}
        />
      </FormRow>

      {/* 7. Ruído de hardware (Switches inline) */}
      <FormRow label="Ruído de hardware" alignTop>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
          {config.hardwareNoiseItems.map((toggle) => {
            const isChecked = !!(formData.hardwareNoise as any)[toggle.key];
            return (
              <NoisePill
                key={toggle.key}
                label={toggle.label}
                desc={toggle.desc}
                checked={isChecked}
                onToggle={() =>
                  onChange('hardwareNoise', {
                    ...formData.hardwareNoise,
                    [toggle.key]: !isChecked,
                  })
                }
              />
            );
          })}
        </div>
      </FormRow>

      {/* 8. Metadados WebGL */}
      <FormRow label="Metadados WebGL" alignTop>
        <SegmentedGroup
          options={config.webglMetadataModes}
          value={formData.webglMetadataMode || 'custom'}
          onChange={(val) => onChange('webglMetadataMode', val)}
        />
        {(formData.webglMetadataMode || 'custom') === 'custom' && (
          <div className="max-w-lg space-y-3 rounded-lg border border-[#333541] bg-[#1C1D24] p-3">
            <div>
              <label className="mb-1 block text-[11.5px] text-[#8E92A2]">
                Fornecedor
              </label>
              <select
                value={formData.webglVendor}
                onChange={(e) => onChange('webglVendor', e.target.value)}
                className="w-full rounded border border-[#333541] bg-[#16171D] px-3 py-1.5 text-[12px] text-white focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none"
              >
                {config.webglVendors.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11.5px] text-[#8E92A2]">
                Renderizador
              </label>
              <ShuffleInput
                value={formData.webglRenderer}
                onChange={(val) => onChange('webglRenderer', val)}
                onShuffle={handleShuffleRenderer}
                title="Sortear Renderizador"
                maxWidthClass="w-full"
              />
            </div>
          </div>
        )}
      </FormRow>

      {/* 9. WebGPU */}
      <FormRow label="WebGPU">
        <SegmentedGroup
          options={config.webgpuModes}
          value={formData.webgpuMode || 'webgl'}
          onChange={(val) => onChange('webgpuMode', val)}
        />
      </FormRow>

      {/* 10. CPU */}
      <FormRow label="CPU" alignTop>
        <SegmentedGroup
          options={config.cpuModes}
          value={formData.cpuMode || 'custom'}
          onChange={(val) => onChange('cpuMode', val)}
        />
        {(formData.cpuMode || 'custom') === 'custom' && (
          <div className="w-48">
            <select
              value={formData.cpuCores}
              onChange={(e) => onChange('cpuCores', Number(e.target.value))}
              className="w-full rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 text-[12.5px] text-[#C4C7D5] focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none"
            >
              {config.cpuCoresOptions.map((cores) => (
                <option key={cores} value={cores}>
                  {cores} núcleos
                </option>
              ))}
            </select>
          </div>
        )}
      </FormRow>

      {/* 11. RAM */}
      <FormRow label="RAM" alignTop>
        <SegmentedGroup
          options={config.ramModes}
          value={formData.ramMode || 'custom'}
          onChange={(val) => onChange('ramMode', val)}
        />
        {(formData.ramMode || 'custom') === 'custom' && (
          <div className="w-48">
            <select
              value={formData.ramGb || 8}
              onChange={(e) => onChange('ramGb', Number(e.target.value))}
              className="w-full rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 text-[12.5px] text-[#C4C7D5] focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none"
            >
              {config.ramOptions.map((ram) => (
                <option key={ram} value={ram}>
                  {ram} GB
                </option>
              ))}
            </select>
          </div>
        )}
      </FormRow>

      {/* 12. Bateria */}
      <FormRow label="Bateria">
        <SegmentedGroup
          options={config.batteryModes}
          value={formData.batteryMode}
          onChange={(val) => onChange('batteryMode', val)}
        />
      </FormRow>

      {/* 13. Nome do dispositivo */}
      <FormRow label="Nome do dispositivo" alignTop>
        <SegmentedGroup
          options={config.deviceNameModes}
          value={formData.deviceNameMode || 'custom'}
          onChange={(val) => onChange('deviceNameMode', val)}
        />
        {(formData.deviceNameMode || 'custom') === 'custom' && (
          <ShuffleInput
            value={formData.deviceName || ''}
            onChange={(val) => onChange('deviceName', val)}
            onShuffle={handleShuffleDeviceName}
            title="Sortear Nome"
          />
        )}
      </FormRow>

      {/* 14. MAC Address */}
      <FormRow label="MAC Address" alignTop>
        <SegmentedGroup
          options={config.macAddressModes}
          value={formData.macAddressMode || 'custom'}
          onChange={(val) => onChange('macAddressMode', val)}
        />
        {(formData.macAddressMode || 'custom') === 'custom' && (
          <ShuffleInput
            value={formData.macAddress || ''}
            onChange={(val) => onChange('macAddress', val)}
            onShuffle={handleShuffleMacAddress}
            title="Sortear MAC"
            mono
          />
        )}
      </FormRow>

      {/* 15. Do Not Track */}
      <FormRow label="Do Not Track">
        <SegmentedGroup
          options={config.doNotTrackModes}
          value={formData.doNotTrackMode || 'default'}
          onChange={(val) => onChange('doNotTrackMode', val)}
        />
      </FormRow>

      {/* 16. Proteção de Port Scan */}
      <FormRow label="Proteção de Port Scan" alignTop>
        <SegmentedGroup
          options={config.portScanProtectionModes}
          value={formData.portScanProtection || 'open'}
          onChange={(val) => onChange('portScanProtection', val)}
        />
        <input
          type="text"
          placeholder="Opcional: Portas autorizadas (ex: 80, 443, 8080)"
          value={formData.portScanAllowedPorts || ''}
          onChange={(e) => onChange('portScanAllowedPorts', e.target.value)}
          className="w-full max-w-md rounded border border-[#333541] bg-[#1C1D24] px-3 py-1.5 text-[12px] text-white focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none"
        />
      </FormRow>

      {/* 17. Aceleração de Hardware */}
      <FormRow label="Aceleração de Hardware">
        <SegmentedGroup
          options={config.hardwareAccelerationModes}
          value={formData.hardwareAcceleration || 'default'}
          onChange={(val) => onChange('hardwareAcceleration', val)}
        />
      </FormRow>

      {/* 18. Recursos TLS Legados */}
      <FormRow label="Recursos TLS Legados">
        <SegmentedGroup
          options={config.disableTlsFeaturesModes}
          value={formData.disableTlsFeatures || 'close'}
          onChange={(val) => onChange('disableTlsFeatures', val)}
        />
      </FormRow>

      {/* 19. Argumentos extras */}
      <FormRow label="Argumentos extras" alignTop>
        <textarea
          rows={3}
          value={formData.launchHook || ''}
          onChange={(e) => onChange('launchHook', e.target.value)}
          placeholder={`--disable-notifications\n--blink-settings=imagesEnabled=false`}
          className="w-full max-w-lg rounded-md border border-[#333541] bg-[#1C1D24] px-3 py-2 font-mono text-[12px] text-white placeholder-[#5C6070] focus:border-white/60 focus:ring-1 focus:ring-white/15 focus:outline-none"
        />
      </FormRow>
    </div>
  );
};
