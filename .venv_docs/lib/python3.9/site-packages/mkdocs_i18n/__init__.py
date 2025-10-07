#
#   Copyright © 2020, 2021 Simó Albert i Beltran
#
#   This file is part of MkDocs i18n plugin.
#
#   Mkdocs i18n plugin is free software: you can redistribute it and/or modify
#   it under the terms of the GNU Affero General Public License as published by
#   the Free Software Foundation, either version 3 of the License, or (at your
#   option) any later version.
#
#   Foobar is distributed in the hope that it will be useful, but WITHOUT ANY
#   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
#   FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
#   details.
#
#   You should have received a copy of the GNU Affero General Public License
#   along with MkDocs i18n plugin. If not, see <https://www.gnu.org/licenses/>.
#
# SPDX-License-Identifier: AGPL-3.0-or-later

"""Plugin to internationalize MkDocs"""

from copy import copy, deepcopy

from mkdocs.config.config_options import Type
from mkdocs.plugins import BasePlugin
from mkdocs.structure import nav as mkdocs_nav


def _get_page_from_src_path(src_path, pages):
    for page in pages:
        if src_path == page.file.src_path:
            return page
    return None


def _remove_nav_pages(pages, remove_pages):
    for page in remove_pages:
        if page in pages:
            pages.remove(page)


class I18n(BasePlugin):
    """Mkdocs plugin class"""

    config_scheme = (
        ("languages", Type(dict, required=True)),
        ("default_language", Type(str, required=True)),
        ("no_translation", Type(dict, default={})),
        ("translate_nav", Type(dict, default={})),
    )

    def on_config(self, config):
        """Adds attr_list markdown extension to configuration

        https://www.mkdocs.org/user-guide/plugins/#on_config

        :param config: global configuration object
        :return: global configuration object
        """
        if "attr_list" not in config["markdown_extensions"]:
            config["markdown_extensions"].append("attr_list")
        return config

    def _get_lang(self, page):
        default_lang = self.config.get("default_language")
        lang = page.url.rsplit(".", 1)[-1].strip("/")
        if lang in self.config.get("languages"):
            return lang
        return default_lang

    def _get_localized_src_paths(self, src_path, lang):
        possible_lang = src_path.rsplit(".", 2)[-2]
        if possible_lang in self.config.get("languages"):
            basename = src_path.rsplit(".", 2)[-3]
        else:
            basename = src_path.rsplit(".", 1)[-2]
        src_paths = [f"{basename}.{lang}.md"]
        if lang == self.config.get("default_language"):
            src_paths.insert(0, f"{basename}.md")
        return src_paths

    def _get_page(self, page, lang, pages):
        for src_path in self._get_localized_src_paths(page.file.src_path, lang):
            page = _get_page_from_src_path(src_path, pages)
            if page:
                return page
        return None

    def _get_language_alternate(self, page, pages, back_to_root=False):
        language_alternate = []
        current_lang = self._get_lang(page)
        languages = copy(self.config.get("languages", {}))
        if current_lang in languages:
            languages.pop(current_lang)
        for lang, lang_name in languages.items():
            translated_page = self._get_page(page, lang, pages)
            if translated_page:
                if back_to_root:
                    url = "../" * page.url.count("/")
                else:
                    url = ""
                url += translated_page.url
            else:
                url = False
            language_alternate.append(
                {
                    "translated_page": translated_page,
                    "lang": lang,
                    "lang_name": lang_name,
                    "url": url,
                }
            )
        return language_alternate

    # pylint: disable=unused-argument
    def on_page_markdown(self, markdown, *, page, config, files):
        """Adds a list of configured languages at the top of page with links
        to translated pages

        https://www.mkdocs.org/user-guide/plugins/#on_page_markdown

        :param markdown: Markdown source text of page as string
        :param page: `mkdocs.nav.Page` instance
        :param config: global configuration object (not used)
        :param files: global files collection
        :return: Markdown source text of page as string
        """
        markdown_lang_links = ""
        pages = [file.page for file in files.src_paths.values() if file.page]
        for alternate in self._get_language_alternate(page, pages, back_to_root=True):
            if alternate.get("translated_page"):
                markdown_lang_links += (
                    f"- [{alternate.get('lang_name')}]({alternate.get('url')})\n"
                    f"{{: .i18n-link .i18n-link-found "
                    f".i18n-link-{alternate.get('lang')} }}\n"
                )
            else:
                no_translation = self.config.get("no_translation", {}).get(
                    alternate.get("lang"), ""
                )
                if no_translation:
                    markdown_lang_links += (
                        f"- {alternate.get('lang_name')}: {no_translation}\n"
                        f"{{: .i18n-link .i18n-link-not-found "
                        f".i18n-link-{alternate.get('lang')} }}\n"
                    )
        return f"{markdown_lang_links}\n\n{markdown}"

    def _nav_save(self, item):
        if hasattr(item, "items"):
            item.items_origin = items = copy(item.items)
            item.pages_origin = copy(item.pages)
        elif hasattr(item, "children"):
            item.children_origin = items = copy(item.children)
        if hasattr(item, "title"):
            item.title_origin = item.title
        for subitem in items:
            if hasattr(subitem, "title"):
                subitem.title_origin = subitem.title
            if subitem.is_section:
                self._nav_save(subitem)

    def _nav_restore(self, item):
        if hasattr(item, "items"):
            item.items = items = copy(item.items_origin)
            item.pages = copy(item.pages_origin)
        elif hasattr(item, "children"):
            item.children = items = copy(item.children_origin)
        if hasattr(item, "title"):
            item.title = item.title_origin
        for subitem in items:
            if hasattr(subitem, "title"):
                subitem.title = subitem.title_origin
            if subitem.is_section:
                self._nav_restore(subitem)

    def _customize_extra_alternate(self, context, lang):
        pages = [file.page for file in context["pages"]]
        if "alternate_origin" not in context["config"]["extra"]:
            context["config"]["extra"]["alternate_origin"] = deepcopy(
                context["config"]["extra"]["alternate"]
            )
        context["config"]["extra"]["alternate"] = deepcopy(
            context["config"]["extra"]["alternate_origin"]
        )
        for alternate_config in context["config"]["extra"]["alternate"]:
            if alternate_config.get("lang") == lang:
                alternate_config["name"] = self.config.get("languages", {}).get(
                    lang, alternate_config.get("name", lang)
                )
                alternate_config["link"] = context["page"].url
            else:
                for alternate in self._get_language_alternate(context["page"], pages):
                    if alternate.get("translated_page") and alternate.get(
                        "lang"
                    ) == alternate_config.get("lang"):
                        alternate_config.update(
                            {
                                "name": alternate.get("lang_name"),
                                "link": alternate.get("url"),
                                "lang": alternate.get("lang"),
                            }
                        )

    def _get_pages_to_remove(self, pages, lang):
        remove = []
        for page in pages:
            if lang != self._get_lang(page):
                if self._get_page(page, lang, pages):
                    remove.append(page)
        return remove

    def _remove_nav_items(self, items, remove_pages):
        _remove_nav_pages(items, remove_pages)
        for item in items:
            if item.is_section:
                self._remove_nav_items(item.children, remove_pages)

    def _translate_title(self, title, lang):
        translate = self.config.get("translate_nav", {}).get(lang, {})
        return translate.get(title, title)

    def _translate_nav_items(self, items, lang):
        for item in items:
            if item.title:
                if item.is_page:
                    page_lang = self._get_lang(item)
                    item.title = self._translate_title(item.title, page_lang)
                    if page_lang != lang:
                        page_lang_name = self.config.get("languages", {}).get(
                            page_lang, None
                        )
                        if page_lang_name:
                            item.title = f"{item.title} ({page_lang_name})"
                else:
                    item.title = self._translate_title(item.title, lang)
            if item.is_section:
                self._translate_nav_items(item.children, lang)

    # pylint: disable=unused-argument
    def on_page_context(self, context, *, page, config, nav):
        """Removes from navigation pages of other languages if there is a page
        with current language

        https://www.mkdocs.org/user-guide/plugins/#on_page_context

        :param context: dict of template context variables
        :param page: `mkdocs.nav.Page` instance
        :param config: global configuration object (not used)
        :param nav: global navigation object
        :return: dict of template context variables
        """
        # We cannot use on_nav to keep original nav due to in on_nav the pages
        # without title in nav config have None as title instead the title of
        # markdown.
        if not hasattr(nav, "items_origin"):
            self._nav_save(nav)
        self._nav_restore(nav)
        lang = self._get_lang(page)
        if config["theme"].name == "material":
            context["config"]["theme"].language = lang
            if "alternate" in context["config"]["extra"]:
                self._customize_extra_alternate(context, lang)
        remove = self._get_pages_to_remove(nav.pages, lang)
        _remove_nav_pages(nav.pages, remove)
        self._remove_nav_items(nav.items, remove)
        self._translate_nav_items(nav.items, lang)
        # pylint: disable=protected-access
        mkdocs_nav._add_previous_and_next_links(nav.pages)
        return context
