# Privacy

TrussIQ is designed to run locally in your browser for classroom learning. **Most data stays private by default.**

## What stays on your device

- Truss models, named project library entries, drafts, theme, tutorial progress, and checklist notes are stored in **browser local storage** on this device only when you allow it.
- Finite-element analysis runs **entirely in the browser**. Geometry and results are not uploaded to a TrussIQ server (there is no TrussIQ backend for models).
- Export files (JSON, PDF, GLB, project summaries) are created on your device.

## Privacy defaults (safe for classrooms)

| Setting | Default | Effect |
| --- | --- | --- |
| Private session | Off | When **on**, models and briefs are **not** autosaved to this browser. Export a `.truss` file to keep work. |
| Shareable design links | **Locked** | Creating a link requires an explicit checkbox. Links encode the model in the URL (history / anyone with the link can open it). |
| Cloud Gemini coach | **Locked** | Local engineering rules run with no network. Cloud answers need Privacy consent **and** an API key. |
| Names on exports | **Off** | Student/team and course fields are omitted from worksheets, brief downloads, and review packets unless you opt in. |
| Project summary | Opt-in | Personal fields require a consent checkbox in the summary dialog (unchanged). |

Open **More → Privacy** in the workspace to change these settings or **Clear private data** (drafts, library, comments, brief, Gemini key). UI chrome prefs such as theme are kept.

## Personal data in shared exports

- **Project summary** exports (HTML/JSON) exclude student/team name and course **by default**.
- Including those optional fields requires an explicit checkbox consent in the Project summary dialog before download.
- Project brief fields (author, course) stored locally are never added to worksheets or review packets unless **Include names on exports** is enabled in Privacy.

## Optional Google Gemini coaching

- Without Privacy → Allow cloud Gemini coach (and without a key), the engineering coach uses **local rules** only. No model data is sent to Google.
- If you enable cloud coaching and set `VITE_GEMINI_API_KEY` or paste a key in the coach panel, chat prompts and a summary of your current model/results are sent to **Google’s Gemini API**.
- Keys saved in the UI are stored in local storage on this device. Do not paste keys into shared demos or screen recordings.
- Google’s processing of API requests is governed by Google’s terms and privacy policy for the Gemini API / AI Studio. Review those documents before enabling Gemini in a school setting.

## What we do not collect

TrussIQ does not operate an account system, analytics backend, or telemetry service as part of this repository. Third-party CDNs (for example Google Fonts when online) may receive standard browser requests when pages load.

## Learning tool disclaimer

Analysis results are educational estimates for planar, pin-jointed, linear elastic trusses. They are **not** construction design approvals, safety certifications, or professional engineering advice.

## Contact

For classroom deployments, prefer **Private session** + local-rules coach (no API key, cloud coaching locked) unless your school has approved cloud Gemini and student data policies.
