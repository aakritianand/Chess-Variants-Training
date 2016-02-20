﻿using AtomicChessPuzzles.Models;
using MongoDB.Bson;
using MongoDB.Driver;
using System;
using System.Linq;

namespace AtomicChessPuzzles.DbRepositories
{
    public class PuzzleRepository : IPuzzleRepository
    {
        MongoSettings settings;
        IMongoCollection<Puzzle> puzzleCollection;
        Random rnd;

        public PuzzleRepository()
        {
            settings = new MongoSettings();
            rnd = new Random();
            GetCollection();
        }

        private void GetCollection()
        {
            MongoClient client = new MongoClient();
            puzzleCollection = client.GetDatabase(settings.Database).GetCollection<Puzzle>(settings.PuzzleCollectionName);
        }

        public bool Add(Puzzle puzzle)
        {
            var found = puzzleCollection.Find(new BsonDocument("_id", new BsonString(puzzle.ID)));
            if (found != null && found.Any()) return false;
            try
            {
                puzzleCollection.InsertOne(puzzle);
            }
            catch (Exception e) when (e is MongoWriteException || e is MongoBulkWriteException)
            {
                return false;
            }
            return true;
        }

        public Puzzle Get(string id)
        {
            var found = puzzleCollection.Find(new BsonDocument("_id", new BsonString(id)));
            if (found == null) return null;
            return found.FirstOrDefault();
        }

        public Puzzle GetOneRandomly()
        {
            long count = puzzleCollection.Count(new BsonDocument());
            if (count < 1) return null;
            return puzzleCollection.Find(new BsonDocument()).FirstOrDefault();
        }

        public DeleteResult Remove(string id)
        {
            return puzzleCollection.DeleteOne(new BsonDocument("_id", new BsonString(id)));
        }

        public DeleteResult RemoveAllBy(string author)
        {
            return puzzleCollection.DeleteMany(new BsonDocument("author", new BsonString(author)));
        }
    }
}