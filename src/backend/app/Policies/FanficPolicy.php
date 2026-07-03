<?php

namespace App\Policies;

use App\Models\Fanfic;
use App\Models\User;

class FanficPolicy
{
    public function update(User $user, Fanfic $fanfic): bool
    {
        return $user->id === $fanfic->user_id;
    }

    public function moderate(User $user, Fanfic $fanfic): bool
    {
        return $user->role === 'admin';
    }
}
