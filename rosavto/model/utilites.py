class DictionaryMixin():
    def __init__(self):
        pass

    def set_fields_from_dict(self, dictionary):
        if type(dict) is dict:
            for k, v in dict.items():
                if v == '':
                    v = None
                if hasattr(self, k): setattr(self, k, v)