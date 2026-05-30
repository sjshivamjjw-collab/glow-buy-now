I’ll fix the mobile feed card rendering so text-only posts behave exactly like the screenshot should not:

1. Update the text-only cover component so the beige background and handwritten font are forced on the actual visible card area, not affected by the dark card/image wrapper.
2. Make the text cover fill the full media area on mobile with centered title, enough padding, and a minimum readable font size.
3. Change the feed title logic to show the title below the card only when a real uploaded media URL exists, not when the post is text-only or when media_count is stale.
4. Apply the same no-duplicate-title behavior to saved/profile grid cards where the text cover is reused.
5. Verify the relevant files after changes to confirm text-only posts use beige handwritten covers and no repeated footer title.