<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Idea extends Model
{
    // Tell Laravel which columns we are allowed to fill with data
    protected $fillable = ['text', 'color', 'priority'];

    // Establish the relationship
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
