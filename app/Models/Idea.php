<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Idea extends Model
{
    protected $fillable = ['user_id', 'text', 'color', 'pattern', 'priority', 'parent_id', 'last_interacted_at', 'is_completed', 'completed_at'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function children()
    {
        return $this->hasMany(Idea::class, 'parent_id');
    }

    public function updates(): HasMany
    {
        return $this->hasMany(IdeaUpdate::class)->latest();
    }
}
