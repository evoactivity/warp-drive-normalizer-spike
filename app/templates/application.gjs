import { pageTitle } from 'ember-page-title';
import { Request } from '@warp-drive/ember';
import { query, findRecord } from '@warp-drive/utilities/json-api';
import { htmlSafe } from '@ember/template';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt();

function markdown(text) {
  return htmlSafe(md.render(text || ''));
}

<template>
  {{! template-lint-disable no-inline-styles }}
  {{pageTitle "MyAppName"}}

  {{outlet}}

  <Request @query={{query "article"}}>
    <:content as |result|>
      {{#each result.data as |article|}}
        <div
          style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px;"
        >
          <div>{{article.title}}</div>
          <div>{{markdown article.body}}</div>
          <div>Author: {{article.author.username}}</div>
        </div>
      {{/each}}
    </:content>
    <:loading>
      <div>Loading articles...</div>
    </:loading>
    <:error as |error|>
      <div>Error loading articles: {{error.message}}</div>
    </:error>
  </Request>

  <Request @query={{query "tag"}}>
    <:content as |result|>
      {{#each result.data as |tag|}}
        <div>{{tag.name}}</div>
      {{/each}}
    </:content>
    <:loading>
      <div>Loading tags...</div>
    </:loading>
    <:error as |error|>
      <div>Error loading tags: {{error.message}}</div>
    </:error>
  </Request>

  <Request @query={{findRecord "profile" "johndoe"}}>
    <:content as |result|>

      <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px;">
        <div>Username: {{result.data.username}}</div>
        <div>Bio: {{result.data.bio}}</div>
        <div>Image:
          <img
            src="{{result.data.image}}"
            alt="{{result.data.username}}'s profile"
          /></div>
      </div>

    </:content>
    <:loading>
      <div>Loading user profile...</div>
    </:loading>
    <:error as |error|>
      <div>Error loading user profile: {{error.message}}</div>
    </:error>
  </Request>
</template>
