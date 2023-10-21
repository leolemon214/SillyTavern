import { doExtrasFetch, getApiUrl, modules } from "../../extensions.js";

export { BertVITS2TtsProvider };

const DEBUG_PREFIX = "<Bert-VITS2 TTS module> ";
let speakerList = [];

function throwIfModuleMissing() {
    if (!modules.includes('bert-vits2-tts')) {
        const message = `Bert-VITS2 TTS module not loaded. Add bert-vits2-tts to enable-modules and restart the Extras API.`
        // toastr.error(message, { timeOut: 10000, extendedTimeOut: 20000, preventDuplicates: true });
        throw new Error(DEBUG_PREFIX, message);
    }
}

class BertVITS2TtsProvider {
    settings;

    defaultSettings = {
        voiceMap: {},
        language: "ZH",
        sdp_ratio: 0.2,
        noise: 0.5,
        noisew: 0.9,
        length: 1.0
    };

    get settingsHtml() {
        return `
        <label for="bert_vits2_speaker_select">Select Speaker:</label>
        <select id="bert_vits2_speaker_select">
            <!-- Populated by JS -->
        </select>
        `
    }

    async loadSettings(settings) {
        this.settings = this.defaultSettings;

        for (const key in settings) {
            if (key in this.settings) {
                this.settings[key] = settings[key]
            } else {
                throw DEBUG_PREFIX + `Invalid setting passed to extension: ${key}`
            }
        }

        const url = new URL(getApiUrl());
        url.pathname = "/api/text-to-speech/bert-vits2/get-speakers"
        const result = await doExtrasFetch(url)

        if (result.ok) {
            speakerList = await result.json()
            console.log('Speaker list successfully updated.')
        }
        this.updateSpeakerList();
    }

    updateSpeakerList() {
        $("#bert_vits2_speaker_select").empty();
        $("#bert_vits2_speaker_select")
            .find("option")
            .remove()
            .end()
            .append('<option value="none">Select Voice</option>')
            .val("none")
        for (const speaker of speakerList) {
            $("#bert_vits2_speaker_select").append(new Option(speaker, speaker));
        }
    }

    async generateTts(text, voiceId) {
        throwIfModuleMissing();

        const url = new URL(getApiUrl());
        url.pathname = "/api/text-to-speech/bert-vits2/generate-tts";
        url.search = new URLSearchParams({
            "language": this.settings.language,
            "speaker": voiceId,
            "text": text,
            "spd_ratio": this.settings.spd_ratio,
            "noise": this.settings.noise,
            "noisew": this.settings.noisew,
            "length": this.settings.length
        }).toString();
        console.debug(DEBUG_PREFIX, "Preparing TTS request for ", url);

        const apiResult = await doExtrasFetch(url);

        if (!apiResult.ok) {
            toastr.error(apiResult.statusText, 'TTS Generation Failed');
            throw new Error(`HTTP ${apiResult.status}: ${await apiResult.text()}`);
        }
        return apiResult;
    }

    async getVoice(voiceName) {
        let match = await  this.fetchTtsVoiceObjects();
        match = match.filter(voice => voice.name === voiceName)[0]
        if (!match) {
            throw `TTS Voice name ${voiceName} not found in BertVITS2 Provider voice list`
        }
        return match;
    }

    async checkReady() {
        await this.onRefreshClick();
    }

    async onRefreshClick() {
        throwIfModuleMissing();
        await this.fetchTtsVoiceObjects();
    }

    async fetchTtsVoiceObjects() {
        const voiceIds = speakerList.map(spk => {
            return {name: spk, voice_id: spk, preview_url: false};
        })
        return voiceIds
    }

    // Do nothing
    previewTtsVoice(id) {}

    async fetchTtsFromHistory(history_item_id) {
        return Promise.resolve(history_item_id);
    }
}
