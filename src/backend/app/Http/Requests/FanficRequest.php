<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class FanficRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $imageRule = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'image_url' => [$imageRule, 'url', 'max:2048'],
            'caption'   => ['nullable', 'string', 'max:500'],
            'city_name' => ['required', 'string', 'max:255'],
            'latitude'  => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ];
    }
}
