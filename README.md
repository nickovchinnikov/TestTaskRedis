For start the server:

```$xslt
yarn && yarn start
```

If you use the Postman just import collection ``postman_collection.json`` and run ``EchoAtTime``

You can change query params in ``body``

```
{
   	"time": "18:13:55",
   	"message": "Some custom message"
}
```

``time`` the time when you'll see msg on console

``message`` a message to be printed