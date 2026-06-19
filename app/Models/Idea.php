<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class Idea (The Blueprint of a Thought)
 * 
 * In Laravel, a Model represents a single table in our database—in this case, the 'ideas' table.
 * Why use a Model instead of just writing SQL? Eloquent (Laravel's ORM) allows us to interact 
 * with our database using expressive, object-oriented PHP. Instead of worrying about raw database queries,
 * we can treat an "Idea" as an object with properties and relationships.
 * 
 * This model defines the structure and the rules for what data can be saved, as well as how 
 * an Idea relates to other entities (like a User, or its own "children" ideas).
 */
class Idea extends Model
{
    /**
     * Mass Assignment Protection ($fillable)
     * 
     * Why restrict this? This is a crucial security feature. It prevents a malicious user from 
     * passing unexpected data in a request and having it automatically saved to the database. 
     * We explicitly whitelist only the columns that are safe to be filled via user input.
     */
    protected $fillable = ['text', 'color', 'priority', 'parent_id', 'last_interacted_at', 'is_completed', 'completed_at'];

    /**
     * The User Relationship
     * 
     * This establishes that every Idea belongs to one specific User.
     * Behind the scenes, Laravel knows to look for a 'user_id' column on the ideas table.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The Children Relationship (Hierarchical Data)
     * 
     * This is an example of a "self-referential" relationship. An idea can be a parent 
     * to other ideas. Why do this? It allows us to build complex trees of thoughts, 
     * linking related concepts together under a primary node.
     */
    public function children()
    {
        return $this->hasMany(Idea::class, 'parent_id');
    }
}
