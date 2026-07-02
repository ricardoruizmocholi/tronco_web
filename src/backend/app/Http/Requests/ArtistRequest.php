<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ArtistRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'avatar_url'  => $this->avatar_url  ?: null,
            'website_url' => $this->website_url ?: null,
        ]);
    }

    public function rules(): array
    {
        return [
            'name'       => ['required', 'string', 'max:255'],
            'bio'        => ['nullable', 'string'],
            'avatar_url' => ['nullable', 'string', 'url', 'max:2048'],
            'website_url'=> ['nullable', 'string', 'url', 'max:2048'],
            'is_active'  => ['sometimes', 'boolean'],
            'user_id'    => ['nullable', 'integer', 'exists:users,id'],

            'video_urls'   => ['nullable', 'array'],
            'video_urls.*' => ['string', 'url', 'max:2048'],

            'social_links'           => ['nullable', 'array'],
            'social_links.instagram' => ['nullable', 'string', 'max:255'],
            'social_links.twitter'   => ['nullable', 'string', 'max:255'],
            'social_links.tiktok'    => ['nullable', 'string', 'max:255'],
            'social_links.youtube'   => ['nullable', 'string', 'max:255'],
            'social_links.twitch'    => ['nullable', 'string', 'max:255'],
            'social_links.bandcamp'  => ['nullable', 'string', 'max:255'],
        ];
    }
}
