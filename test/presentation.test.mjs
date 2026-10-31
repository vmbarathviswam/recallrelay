import test from 'node:test';
import assert from 'node:assert/strict';
import {evidenceFields,readableValue} from '../web/presentation.mjs';
test('AI findings render hostile values and keys as text, never HTML',()=>{
  const html=evidenceFields({'<img src=x onerror=alert(1)>':'<script>alert(1)</script>'});
  assert(!html.includes('<img'));assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));
});
test('nested provider details retain false and zero values',()=>{
  const text=readableValue({amountCents:0,verified:false,details:{code:'PENDING'}});
  assert(text.includes('Amount Cents: 0'));assert(text.includes('Verified: No'));assert(text.includes('Code: PENDING'));
});
test('source quotations preserve text while escaping markup',()=>{
  const html=evidenceFields({sourceQuotes:['Model <N65> & serial "0421"']});
  assert(html.includes('<blockquote>'));assert(html.includes('Model &lt;N65&gt; &amp; serial &quot;0421&quot;'));
});
test('missing and empty evidence are explicitly described',()=>{
  assert.equal(readableValue(null),'Not supplied');assert.equal(readableValue([]),'None recorded');
});
