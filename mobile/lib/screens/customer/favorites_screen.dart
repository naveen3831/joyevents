import 'package:flutter/material.dart';

import '../../config/app_theme.dart';
import '../../services/api_service.dart';
import '../../widgets/customer_app_bar.dart';
import '../../widgets/empty_state.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  final ApiService _apiService = ApiService();
  List<dynamic> _favorites = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchFavorites();
  }

  Future<void> _fetchFavorites() async {
    setState(() {
      _isLoading = true;
    });
    try {
      final response = await _apiService.dio.get('/favorites');
      final data = response.data;
      if (data is Map && data.containsKey('favorites')) {
        setState(() {
          _favorites = data['favorites'] as List;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const CustomerAppBar(
        title: 'Saved Favorites',
        showBack: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _favorites.isEmpty
              ? const EmptyState(
                  title: 'No Favorites Saved',
                  message: 'Your saved events and services will appear here.',
                  icon: Icons.favorite_border_rounded,
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _favorites.length,
                  itemBuilder: (context, index) {
                    final item = _favorites[index];
                    final event = item['event'];
                    final service = item['service'];
                    final title = event?['title'] ?? service?['name'] ?? 'Favorite Item';

                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: Color(0xFFFEE2E2),
                          child: Icon(Icons.favorite, color: AppTheme.errorColor),
                        ),
                        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(item['type'] == 'event' ? 'Saved Event' : 'Saved Service'),
                      ),
                    );
                  },
                ),
    );
  }
}
