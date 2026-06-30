<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Idea extends Model
{
    // Tell Laravel which columns we are allowed to fill with data
    protected $fillable = ['user_id', 'text', 'color', 'pattern', 'priority', 'parent_id', 'last_interacted_at', 'is_completed', 'completed_at'];

    // Establish the relationship
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function children()
    {
        return $this->hasMany(Idea::class, 'parent_id');
    }
}
