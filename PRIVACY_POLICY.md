# Privacy Policy for lasDoscas - YouTube™ Dual Subtitles

Last updated: 2026-08-11

## 1. Overview

lasDoscas provides synchronized bilingual subtitles on YouTube. The extension does not operate an analytics, advertising, tracking, or developer-controlled data collection service.

## 2. Data Stored in the Browser

The extension uses Chrome's storage APIs to store:

- Subtitle display, language, appearance, and other extension preferences.
- AI provider, enablement, fallback, and rate-limit settings.
- Source captions and translation results cached by video, caption track, language, and translation provider to reduce repeated requests.
- User-provided AI API keys.

AI API keys are stored in browser session storage by default. A key is stored persistently in local browser storage only when the user enables the “Remember key” option. Users can remove a selected provider's key through the extension settings.

This locally stored data is not sent to the extension developer.

## 3. Translation Services

When standard translation is needed and a translated YouTube caption track is unavailable, the extension may send caption text and the target language to the Google Translate service.

When the user explicitly enables optional AI enhancement, the extension sends the caption text, up to three nearby captions used as translation context, the source and target languages, and the user's API key directly to the selected provider:

- Google Gemini
- Groq
- OpenRouter

The API key is used to authenticate requests with the selected provider. It is not sent to YouTube or to the extension developer.

When OpenRouter is selected, submitted data may also be processed by the underlying model provider used by OpenRouter. Translation and AI providers may process or retain request data according to their own terms and privacy policies.

## 4. YouTube Access

The extension accesses YouTube video pages to identify available caption tracks, download caption data, synchronize subtitles with video playback, and display the bilingual subtitle interface. The extension does not send the user's YouTube account information or browsing history to the extension developer.

## 5. Data Sharing and Sale

The extension does not sell user data and does not use user data for advertising, profiling, credit decisions, or purposes unrelated to subtitle translation. Caption text and authentication credentials are shared only with the translation or AI provider required to perform a user-requested translation.

## 6. Changes to This Privacy Policy

This policy may be updated when the extension's features or data practices change. The latest version will be published on this page.

## 7. Contact

Questions about this privacy policy can be submitted through the project's GitHub Issues page.