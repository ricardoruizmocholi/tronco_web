<?php

namespace App\Http\Requests;

use App\Models\SocialLink;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class ReorderSocialLinksRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ids'   => ['required', 'array', 'min:1', 'max:'.SocialLink::MAX_LINKS],
            'ids.*' => ['integer', 'distinct', 'exists:social_links,id'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                // Debe venir el conjunto completo: el servidor decide las posiciones.
                if (! $validator->errors()->has('ids')
                    && count((array) $this->input('ids')) !== SocialLink::count()) {
                    $validator->errors()->add('ids', 'Hay que enviar todas las redes sociales.');
                }
            },
        ];
    }
}
