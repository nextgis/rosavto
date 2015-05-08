# -*- coding: utf-8 -*-

pages_config = [
    ('index', u'Главная', u'На главную', u''),
    (None, u'Слои', u'Подключение слоев', None, [
        ('wms', u'WMS', u'WMS слой', u'Подключение WMS слоя'),
        ('base_layers', u'Подложки', u'Подключение подложек из NextGIS Web', u'Подключение подложек из NextGIS Web'),
        ('layers', u'Тайловые слои', u'Подключение тайловых слоев из NextGIS Web',
         u'Подключение тайловых слоев из NextGIS Web')
    ]),
]


def get_page_config(route_name):
    page_config = search_page_config(pages_config, route_name)
    return {
        'title': page_config[3]
    }


def search_page_config(config, route_name):
    for config_item in config:
        if len(config_item) == 4:
            route_name_current, menu_item_title, menu_item_descr, header_text = config_item
            if route_name_current == route_name:
                return config_item
        else:
            if config_item[0] is None:
                result = search_page_config(config_item[4], route_name)
                if result:
                    return result