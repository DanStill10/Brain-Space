<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IdeaUpdate extends Model
{
    protected $fillable = ['idea_id', 'content', 'media_url', 'media_type'];

    public function idea(): BelongsTo
    {
        return $this->belongsTo(Idea::class);
    }
}
