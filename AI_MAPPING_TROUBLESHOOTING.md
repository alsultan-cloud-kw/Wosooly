# AI Column Mapping Troubleshooting Guide

## What Should You See?

When you navigate to the column mapping page (`/column-mapping/{fileId}`), you should see:

1. **AI Suggestions Banner** - A purple/primary colored card at the top with:
   - A wand icon (✨)
   - "AI-Powered Column Mapping" heading
   - A "Get AI Suggestions" button

2. **After clicking "Get AI Suggestions"**:
   - Loading spinner appears
   - AI analyzes your file
   - Suggestions appear below the banner
   - High-confidence mappings (≥70%) are auto-populated in the form

## If You Don't See the Banner

### Check 1: Verify fileId is passed
- Open browser console (F12)
- Look for: `ColumnMappingForm - fileId: [number], isTemplateMode: false`
- If fileId is `null` or `undefined`, the banner won't show

### Check 2: Check if in Template Mode
- The banner only shows when `isTemplateMode = false`
- Template mode is when there's no fileId in the URL

### Check 3: Verify the Route
- Make sure you're accessing: `/column-mapping/{fileId}` (with a file ID)
- Not: `/column-mapping` (without file ID = template mode)

## If the Button Doesn't Work

### Check Browser Console
1. Open Developer Tools (F12)
2. Go to Console tab
3. Click "Get AI Suggestions" button
4. Look for:
   - `Manual AI trigger - fileId: [number]`
   - `Loading AI suggestions for fileId: [number]`
   - Any error messages in red

### Common Errors

**Error: "File not found"**
- The fileId doesn't exist or doesn't belong to your account
- Solution: Upload a file first, then use that file's ID

**Error: "Connection refused" or Network error**
- Backend server might not be running
- Solution: Start the backend server

**Error: "OPENAI_API_KEY not set"**
- OpenAI API key is missing
- Solution: Set `OPENAI_API_KEY` in your `.env` file

**Error: 404 Not Found**
- The endpoint `/auto-map-columns/{fileId}` doesn't exist
- Solution: Check that `backend/routers/upload.py` is included in `main.py`

## Testing the Endpoint Manually

You can test the endpoint directly using:

```bash
# Replace {fileId} with an actual file ID and {token} with your auth token
curl -X POST "http://localhost:8000/auto-map-columns/1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

Or use Postman/Thunder Client:
- Method: POST
- URL: `http://localhost:8000/auto-map-columns/{fileId}`
- Headers: Include your authentication token

## Expected Response Format

```json
{
  "customer": [
    {
      "canonical_field": "customer_name",
      "excel_column": "اسم العميل",
      "confidence": 0.95,
      "suggested_by": "ai"
    }
  ],
  "order": [...],
  "product": [...],
  "file_id": 1
}
```

## Debug Steps

1. **Check fileId in URL**
   ```
   URL should be: /column-mapping/123 (where 123 is the file ID)
   ```

2. **Check Browser Console**
   - Look for console.log messages
   - Check for any errors

3. **Check Network Tab**
   - Open Network tab in DevTools
   - Click "Get AI Suggestions"
   - Look for POST request to `/auto-map-columns/{fileId}`
   - Check the response status and body

4. **Check Backend Logs**
   - Look at your backend terminal/console
   - Check for any error messages
   - Verify the endpoint is being called

5. **Verify OpenAI API Key**
   - Check `.env` file has `OPENAI_API_KEY=sk-...`
   - Restart backend after adding the key

## Still Not Working?

1. Make sure all files are saved
2. Restart both frontend and backend servers
3. Clear browser cache
4. Check that `backend/utils/ai_column_mapper.py` exists
5. Verify `AIColumnMapper` is imported in `upload.py`

