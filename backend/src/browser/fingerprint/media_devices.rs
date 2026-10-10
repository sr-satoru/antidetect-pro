use std::sync::LazyLock;
use serde_json::Value;

static MEDIA_DEVICES_PRESET: LazyLock<Value> = LazyLock::new(|| {
    let s = include_str!("../../../presets/common/media-devices.json");
    serde_json::from_str(s).unwrap_or(Value::Null)
});

#[derive(Debug, Clone, Default)]
pub struct GeneratedMediaDevices {
    pub micros_count: u32,
    pub micro_labels: Vec<String>,
    pub micro_groups: Vec<String>,
    pub speakers_count: u32,
    pub speaker_labels: Vec<String>,
    pub speaker_groups: Vec<String>,
    pub webcams_count: u32,
    pub webcam_labels: Vec<String>,
    pub webcam_groups: Vec<String>,
}

/// Gera dispositivos de mídia determinísticos baseados no SO e na semente do perfil.
/// Alinha rótulos e groupIds exatamente como o C++ do Camoufox espera (media-device-spoofing.patch).
pub fn generate_media_devices(
    os: &str,
    seed: u64,
    desired_micros: Option<u32>,
    desired_speakers: Option<u32>,
    desired_webcams: Option<u32>,
) -> GeneratedMediaDevices {
    let os_key = match os.to_lowercase().as_str() {
        "windows" | "win" => "win",
        "macos" | "mac" | "darwin" | "ios" => "mac",
        _ => "lin",
    };

    let mut result = GeneratedMediaDevices::default();
    let os_data = match MEDIA_DEVICES_PRESET.get(os_key) {
        Some(v) => v,
        None => return generate_fallback(os_key, desired_micros, desired_speakers, desired_webcams),
    };

    let card_group_id = format!("audio-card-{:x}", seed & 0xffff);
    let camera_group_id = format!("cam-group-{:x}", (seed >> 16) & 0xffff);

    // 1. Placa de som primária (mics e speakers compartilham card_group_id)
    if let Some(cards) = os_data.get("cards").and_then(|c| c.as_array()).filter(|a| !a.is_empty()) {
        let card = &cards[(seed as usize) % cards.len()];
        if let Some(mics) = card.get("mics").and_then(|m| m.as_array()) {
            for m in mics.iter().filter_map(|v| v.as_str()) {
                result.micro_labels.push(m.to_string());
                result.micro_groups.push(card_group_id.clone());
            }
        }
        if let Some(outs) = card.get("outs").and_then(|o| o.as_array()) {
            for o in outs.iter().filter_map(|v| v.as_str()) {
                result.speaker_labels.push(o.to_string());
                result.speaker_groups.push(card_group_id.clone());
            }
        }
    }

    // 2. Câmera integrada ou externa
    if let Some(cameras) = os_data.get("cameras").and_then(|c| c.as_array()).filter(|a| !a.is_empty()) {
        let cam_item = &cameras[((seed >> 8) as usize) % cameras.len()];
        if let Some(cam_name) = cam_item.get("cam").and_then(|c| c.as_str()) {
            result.webcam_labels.push(cam_name.to_string());
            result.webcam_groups.push(camera_group_id.clone());
        }
        // Se a câmera tiver microfone embutido, adiciona o microfone compartilhando camera_group_id
        if let Some(cam_mic) = cam_item.get("mic").and_then(|m| m.as_str()) {
            result.micro_labels.push(cam_mic.to_string());
            result.micro_groups.push(camera_group_id.clone());
        }
    }

    // 3. Dispositivos adicionais se necessário para atingir desired_speakers / desired_micros
    let target_spk = desired_speakers.unwrap_or(2).max(1);
    if (result.speaker_labels.len() as u32) < target_spk {
        let display_group_id = format!("disp-audio-{:x}", (seed >> 24) & 0xffff);
        if let Some(displays) = os_data.get("displays").and_then(|d| d.as_array()).filter(|a| !a.is_empty()) {
            let disp = &displays[((seed >> 12) as usize) % displays.len()];
            if let Some(outs) = disp.get("outs").and_then(|o| o.as_array()) {
                for o in outs.iter().filter_map(|v| v.as_str()) {
                    if (result.speaker_labels.len() as u32) < target_spk {
                        result.speaker_labels.push(o.to_string());
                        result.speaker_groups.push(display_group_id.clone());
                    }
                }
            }
        }
    }

    let target_mic = desired_micros.unwrap_or(1).max(1);
    if (result.micro_labels.len() as u32) < target_mic {
        let headset_group_id = format!("headset-{:x}", (seed >> 20) & 0xffff);
        if let Some(headsets) = os_data.get("headsets").and_then(|h| h.as_array()).filter(|a| !a.is_empty()) {
            let hs = &headsets[((seed >> 14) as usize) % headsets.len()];
            if let Some(mics) = hs.get("mics").and_then(|m| m.as_array()) {
                for m in mics.iter().filter_map(|v| v.as_str()) {
                    if (result.micro_labels.len() as u32) < target_mic {
                        result.micro_labels.push(m.to_string());
                        result.micro_groups.push(headset_group_id.clone());
                    }
                }
            }
        }
    }

    let target_cam = desired_webcams.unwrap_or(1);
    if target_cam == 0 {
        result.webcam_labels.clear();
        result.webcam_groups.clear();
    }

    result.micros_count = result.micro_labels.len() as u32;
    result.speakers_count = result.speaker_labels.len() as u32;
    result.webcams_count = result.webcam_labels.len() as u32;

    result
}

fn generate_fallback(
    os_key: &str,
    desired_micros: Option<u32>,
    desired_speakers: Option<u32>,
    desired_webcams: Option<u32>,
) -> GeneratedMediaDevices {
    let (mic, spk, cam) = match os_key {
        "win" => (
            "Microphone (Realtek(R) Audio)",
            "Speakers (Realtek(R) Audio)",
            "Integrated Camera",
        ),
        "mac" => (
            "MacBook Pro Microphone",
            "MacBook Pro Speakers",
            "FaceTime HD Camera",
        ),
        _ => (
            "Built-in Audio Analog Stereo",
            "Built-in Audio Analog Stereo",
            "Integrated Camera (04f2:b6d9)",
        ),
    };

    let mic_count = desired_micros.unwrap_or(1);
    let spk_count = desired_speakers.unwrap_or(2);
    let cam_count = desired_webcams.unwrap_or(1);

    GeneratedMediaDevices {
        micros_count: mic_count,
        micro_labels: (0..mic_count).map(|_| mic.to_string()).collect(),
        micro_groups: (0..mic_count).map(|_| "default-audio-group".to_string()).collect(),
        speakers_count: spk_count,
        speaker_labels: (0..spk_count).map(|_| spk.to_string()).collect(),
        speaker_groups: (0..spk_count).map(|_| "default-audio-group".to_string()).collect(),
        webcams_count: cam_count,
        webcam_labels: (0..cam_count).map(|_| cam.to_string()).collect(),
        webcam_groups: (0..cam_count).map(|_| "default-cam-group".to_string()).collect(),
    }
}
